/**
 * Minimal Fast Healthcare Interoperability Resources (FHIR) HTTP client for the demo worklist.
 * Calls the Microsoft FHIR Server compartment search — no SQL bypass.
 */

function getBaseUrl() {
  return String(process.env.FHIR_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
}

/**
 * Compartment search: GET /Patient/{patientId}/ImagingStudy
 *
 * @param {{
 *   patientId: string,
 *   modality?: string|null,
 *   sort?: string,
 *   count?: number,
 * }} options
 * @returns {Promise<{ status: number, body: object, resourceType: string }>}
 */
async function searchImagingStudiesByPatient({
  patientId,
  modality = null,
  sort = '-started',
  count = 50,
}) {
  const params = new URLSearchParams();
  params.set('_sort', sort);
  params.set('_count', String(count));
  if (modality) {
    params.set('modality', modality);
  }

  const url = `${getBaseUrl()}/Patient/${encodeURIComponent(patientId)}/ImagingStudy?${params}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/fhir+json',
    },
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'exception',
          diagnostics: 'FHIR server returned non-JSON body',
        },
      ],
    };
  }

  const resourceType = body.resourceType || 'Unknown';
  // Identifiers only — never log patient names, findings, or resource bodies (FHIR-01).
  console.log(
    JSON.stringify({
      eventType: 'fhir.client.response',
      status: res.status,
      resourceType,
    }),
  );

  return { status: res.status, body, resourceType };
}

module.exports = {
  searchImagingStudiesByPatient,
  getBaseUrl,
};
