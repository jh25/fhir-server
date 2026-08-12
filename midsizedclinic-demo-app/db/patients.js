/**
 * Patient directory for the demo chart picker (small dataset — fine for typeahead).
 * Learning note: production apps use FHIR Patient search via the API, not raw SQL.
 */

const zlib = require('zlib');
const { sql, getPool } = require('./pool');

let patientTypeIdCache = null;

function decompressResource(raw) {
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const json = zlib.gunzipSync(buffer).toString('utf8');
  const cleaned = json.charCodeAt(0) === 0xfeff ? json.slice(1) : json;
  return JSON.parse(cleaned);
}

function displayName(patient) {
  const name = patient?.name?.[0];
  if (!name) {
    return patient?.id || 'Unknown';
  }
  const family = name.family || '';
  const given = Array.isArray(name.given) ? name.given.join(' ') : name.given || '';
  if (family && given) {
    return `${family}, ${given}`;
  }
  return family || given || name.text || patient.id;
}

async function resolvePatientTypeId(pool) {
  if (patientTypeIdCache != null) {
    return patientTypeIdCache;
  }
  const result = await pool.request().query(`
    SELECT ResourceTypeId FROM dbo.ResourceType WHERE Name = N'Patient'
  `);
  const id = result.recordset[0]?.ResourceTypeId;
  if (id == null) {
    throw new Error('FHIR schema lookup failed: missing Patient resource type');
  }
  patientTypeIdCache = id;
  return id;
}

/**
 * @param {{ q?: string, limit?: number }} [options]
 * @returns {Promise<Array<{ id: string, display: string, initial: string }>>}
 */
async function searchPatients({ q = '', limit = 25 } = {}) {
  const pool = await getPool();
  const patientTypeId = await resolvePatientTypeId(pool);
  const take = Math.min(Math.max(Number(limit) || 25, 1), 100);

  const result = await pool
    .request()
    .input('PatientTypeId', sql.SmallInt, patientTypeId)
    .input('Count', sql.Int, take)
    .query(`
      SELECT TOP (@Count)
        r.ResourceId,
        r.RawResource
      FROM dbo.Resource r
      WHERE r.ResourceTypeId = @PatientTypeId
        AND r.IsHistory = 0
        AND r.IsDeleted = 0
      ORDER BY r.ResourceId
    `);

  const needle = String(q || '')
    .trim()
    .toLowerCase();

  const rows = result.recordset.map((row) => {
    const resource = decompressResource(row.RawResource);
    const display = displayName(resource);
    const initial = (display.replace(/[^A-Za-z]/g, '').charAt(0) || 'P').toUpperCase();
    return {
      id: resource.id || row.ResourceId,
      display,
      initial,
    };
  });

  if (!needle) {
    return rows;
  }

  return rows.filter((p) => {
    const hay = `${p.id} ${p.display}`.toLowerCase();
    return hay.includes(needle);
  });
}

module.exports = {
  searchPatients,
};
