/**
 * ImagingStudy compartment search against the FHIR SQL schema.
 *
 * Learning note (VERA-1042 teaching shortcut):
 * - Production MUST go through MediatR → IFhirDataStore / generated SqlQueryGenerator plans.
 * - This demo reads dbo.Resource.RawResource + search-param tables directly for clarity.
 * - Never hardcode ResourceTypeId / SearchParamId — they are IDENTITY per database.
 */

const zlib = require('zlib');
const { sql, getPool } = require('./pool');

const PATIENT_SEARCH_URI = 'http://hl7.org/fhir/SearchParameter/clinical-patient';
const MODALITY_SEARCH_URI = 'http://hl7.org/fhir/SearchParameter/ImagingStudy-modality';
const STARTED_SEARCH_URI = 'http://hl7.org/fhir/SearchParameter/ImagingStudy-started';

/** @type {null | { imagingStudyTypeId: number, patientTypeId: number, patientSearchParamId: number, modalitySearchParamId: number, startedSearchParamId: number }} */
let idCache = null;

async function resolveIds(pool) {
  if (idCache) {
    return idCache;
  }

  const typeResult = await pool.request().query(`
    SELECT Name, ResourceTypeId
    FROM dbo.ResourceType
    WHERE Name IN (N'ImagingStudy', N'Patient')
  `);

  const paramResult = await pool.request().query(`
    SELECT Uri, SearchParamId
    FROM dbo.SearchParam
    WHERE Uri IN (
      N'${PATIENT_SEARCH_URI}',
      N'${MODALITY_SEARCH_URI}',
      N'${STARTED_SEARCH_URI}'
    )
  `);

  const types = Object.fromEntries(typeResult.recordset.map((r) => [r.Name, r.ResourceTypeId]));
  const params = Object.fromEntries(paramResult.recordset.map((r) => [r.Uri, r.SearchParamId]));

  const required = [
    ['ImagingStudy', types.ImagingStudy],
    ['Patient', types.Patient],
    [PATIENT_SEARCH_URI, params[PATIENT_SEARCH_URI]],
    [MODALITY_SEARCH_URI, params[MODALITY_SEARCH_URI]],
    [STARTED_SEARCH_URI, params[STARTED_SEARCH_URI]],
  ];

  for (const [label, value] of required) {
    if (value == null) {
      throw new Error(`FHIR schema lookup failed: missing ${label}. Is this a FHIR SQL database?`);
    }
  }

  idCache = {
    imagingStudyTypeId: types.ImagingStudy,
    patientTypeId: types.Patient,
    patientSearchParamId: params[PATIENT_SEARCH_URI],
    modalitySearchParamId: params[MODALITY_SEARCH_URI],
    startedSearchParamId: params[STARTED_SEARCH_URI],
  };

  return idCache;
}

/**
 * Decompress RawResource (GZip UTF-8) the same way CompressedRawResourceConverter does.
 * @param {Buffer|ArrayBuffer|Uint8Array} raw
 * @returns {object}
 */
function decompressResource(raw) {
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const json = zlib.gunzipSync(buffer).toString('utf8');
  // Strip UTF-8 BOM if present (FHIR SQL sometimes stores with BOM).
  const cleaned = json.charCodeAt(0) === 0xfeff ? json.slice(1) : json;
  return JSON.parse(cleaned);
}

/**
 * Search ImagingStudy resources in a patient compartment.
 *
 * @param {{ patientId: string, modality?: string|null, count?: number }} options
 * @returns {Promise<object[]>} Decompressed ImagingStudy resources (newest first)
 */
async function searchByPatient({ patientId, modality = null, count = 50 }) {
  const pool = await getPool();
  const ids = await resolveIds(pool);

  const clampedCount = Math.min(Math.max(Number(count) || 50, 1), 100);

  const request = pool
    .request()
    .input('ImagingStudyTypeId', sql.SmallInt, ids.imagingStudyTypeId)
    .input('PatientTypeId', sql.SmallInt, ids.patientTypeId)
    .input('PatientSearchParamId', sql.SmallInt, ids.patientSearchParamId)
    .input('ModalitySearchParamId', sql.SmallInt, ids.modalitySearchParamId)
    .input('StartedSearchParamId', sql.SmallInt, ids.startedSearchParamId)
    .input('PatientId', sql.NVarChar(64), patientId)
    .input('Modality', sql.NVarChar(128), modality || null)
    .input('Count', sql.Int, clampedCount);

  // Compartment via ReferenceSearchParam (clinical-patient), optional modality token,
  // sort via DateTimeSearchParam (started) DESC — FHIR-10/11 worklist shape.
  const result = await request.query(`
    SELECT TOP (@Count)
      r.ResourceId,
      r.RawResource,
      d.StartDateTime
    FROM dbo.Resource r
    INNER JOIN dbo.ReferenceSearchParam rsp
      ON rsp.ResourceTypeId = r.ResourceTypeId
     AND rsp.ResourceSurrogateId = r.ResourceSurrogateId
    LEFT JOIN dbo.DateTimeSearchParam d
      ON d.ResourceTypeId = r.ResourceTypeId
     AND d.ResourceSurrogateId = r.ResourceSurrogateId
     AND d.SearchParamId = @StartedSearchParamId
    WHERE r.ResourceTypeId = @ImagingStudyTypeId
      AND r.IsHistory = 0
      AND r.IsDeleted = 0
      AND rsp.SearchParamId = @PatientSearchParamId
      AND rsp.ReferenceResourceTypeId = @PatientTypeId
      AND rsp.ReferenceResourceId = @PatientId
      AND (
        @Modality IS NULL OR EXISTS (
          SELECT 1
          FROM dbo.TokenSearchParam t
          WHERE t.ResourceTypeId = r.ResourceTypeId
            AND t.ResourceSurrogateId = r.ResourceSurrogateId
            AND t.SearchParamId = @ModalitySearchParamId
            AND t.Code = @Modality
        )
      )
    ORDER BY d.StartDateTime DESC
  `);

  return result.recordset.map((row) => decompressResource(row.RawResource));
}

module.exports = {
  searchByPatient,
};
