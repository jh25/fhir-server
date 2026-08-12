/**
 * Seeds a small MidSizedClinic imaging demo dataset via the FHIR API.
 *
 * Idempotent:
 * - Checks for stable ImagingStudy ids (stu-demo-*) before writing
 * - Skips entirely when the full seed set is already present
 * - Uses PUT with fixed ids when seeding (no duplicate rows on re-run)
 *
 * Usage: node scripts/seed-demo-data.js
 * Env: FHIR_BASE_URL (default http://localhost:8080)
 *      SEED_FORCE=1  — upsert even if seed markers already exist
 */

const FHIR_BASE = (process.env.FHIR_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const FORCE = String(process.env.SEED_FORCE || '').toLowerCase() === '1' ||
  String(process.env.SEED_FORCE || '').toLowerCase() === 'true';

const DCM = 'http://dicom.nema.org/resources/ontology/DCM';

/** Stable ids — presence of all of these means "already seeded". */
const SEED_STUDY_IDS = [
  'stu-demo-us-1',
  'stu-demo-us-2',
  'stu-demo-us-3',
  'stu-demo-ct-1',
  'stu-demo-us-other',
];

async function fhir(method, path, body, { allowNotFound = false } = {}) {
  const res = await fetch(`${FHIR_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (allowNotFound && res.status === 404) {
    return { status: 404, json: null };
  }
  if (!res.ok) {
    const diagnostics = json?.issue?.[0]?.diagnostics || text.slice(0, 200);
    throw new Error(`${method} ${path} -> ${res.status}: ${diagnostics}`);
  }
  return { status: res.status, json };
}

async function resourceExists(path) {
  const { status } = await fhir('GET', path, undefined, { allowNotFound: true });
  return status === 200;
}

async function isSeedPresent() {
  for (const id of SEED_STUDY_IDS) {
    const exists = await resourceExists(`/ImagingStudy/${id}`);
    if (!exists) {
      return false;
    }
  }
  const patientOk =
    (await resourceExists('/Patient/pat-1001')) && (await resourceExists('/Patient/pat-1002'));
  return patientOk;
}

function coding(code) {
  return { system: DCM, code };
}

function imagingStudy({ id, patientId, started, description, modalityCode, seriesUid }) {
  return {
    resourceType: 'ImagingStudy',
    id,
    status: 'available',
    modality: [coding(modalityCode)],
    subject: { reference: `Patient/${patientId}` },
    started,
    description,
    series: [
      {
        uid: seriesUid,
        modality: coding(modalityCode),
        numberOfInstances: 1,
      },
    ],
  };
}

async function main() {
  console.log(`Seeding against ${FHIR_BASE}`);

  if (!FORCE && (await isSeedPresent())) {
    console.log('Seed data already present (stu-demo-* ImagingStudy + pat-1001/pat-1002). Skipping.');
    console.log('Set SEED_FORCE=1 to upsert anyway.');
    return;
  }

  if (FORCE) {
    console.log('SEED_FORCE=1 — upserting seed resources.');
  }

  await fhir('PUT', '/Patient/pat-1001', {
    resourceType: 'Patient',
    id: 'pat-1001',
    name: [{ family: 'Demo', given: ['Alex'] }],
  });
  console.log('Patient/pat-1001 upserted');

  await fhir('PUT', '/Patient/pat-1002', {
    resourceType: 'Patient',
    id: 'pat-1002',
    name: [{ family: 'Other', given: ['Blake'] }],
  });
  console.log('Patient/pat-1002 upserted');

  const studies = [
    {
      id: 'stu-demo-us-1',
      patientId: 'pat-1001',
      started: '2026-08-11T14:30:00Z',
      description: 'Abdominal ultrasound — routine',
      modalityCode: 'US',
      seriesUid: '2.25.1001001001001001001001001001',
    },
    {
      id: 'stu-demo-us-2',
      patientId: 'pat-1001',
      started: '2026-05-02T09:15:00Z',
      description: 'Thyroid ultrasound — follow-up',
      modalityCode: 'US',
      seriesUid: '2.25.1001001001001001001001001002',
    },
    {
      id: 'stu-demo-us-3',
      patientId: 'pat-1001',
      started: '2025-11-18T16:45:00Z',
      description: 'Renal ultrasound — screening',
      modalityCode: 'US',
      seriesUid: '2.25.1001001001001001001001001003',
    },
    {
      id: 'stu-demo-ct-1',
      patientId: 'pat-1001',
      started: '2026-01-20T11:00:00Z',
      description: 'Chest CT — comparison',
      modalityCode: 'CT',
      seriesUid: '2.25.1001001001001001001001001004',
    },
    {
      id: 'stu-demo-us-other',
      patientId: 'pat-1002',
      started: '2026-07-01T10:00:00Z',
      description: 'Pelvic ultrasound — other patient',
      modalityCode: 'US',
      seriesUid: '2.25.1001001001001001001001002001',
    },
  ];

  for (const study of studies) {
    const { status, json } = await fhir(
      'PUT',
      `/ImagingStudy/${study.id}`,
      imagingStudy(study),
    );
    console.log(`ImagingStudy/${json.id} (${study.modalityCode} ${study.started}) status=${status}`);
  }

  console.log('Seed complete.');
  console.log(
    'Try: curl "http://localhost:3000/Patient/pat-1001/ImagingStudy?modality=US" -H "X-User-Role: clinicTechnician" -H "X-User-Id: tech-1204"',
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
