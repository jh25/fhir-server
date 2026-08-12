/**
 * Resolve which Docker stack the demo app is pointed at from connection config
 * (not from FHIR server). Used for the LOCAL / DEV header badge only.
 *
 * pre-demo (local-setup): FHIR :8080, SQL :1433
 * post-demo (Deploy to Dev): FHIR :8081, SQL :1434
 */

function resolveStackTarget(env = process.env) {
  const sqlPort = String(env.SQL_PORT || '1433').trim();
  const fhirBase = String(env.FHIR_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
  const demoTarget = String(env.DEMO_TARGET || '').toLowerCase();
  const backend = String(env.WORKLIST_BACKEND || 'sql').toLowerCase();

  let target = 'local';
  let how = 'default';

  if (backend === 'fhir') {
    if (/:8081\b/.test(fhirBase)) {
      target = 'dev';
      how = `FHIR_BASE_URL=${fhirBase}`;
    } else if (/:8080\b/.test(fhirBase)) {
      target = 'local';
      how = `FHIR_BASE_URL=${fhirBase}`;
    } else if (demoTarget === 'dev' || demoTarget === 'local') {
      target = demoTarget;
      how = `DEMO_TARGET=${demoTarget}`;
    }
  } else {
    // SQL worklist (and default): port is the source of truth
    if (sqlPort === '1434') {
      target = 'dev';
      how = `SQL_PORT=${sqlPort}`;
    } else if (sqlPort === '1433') {
      target = 'local';
      how = `SQL_PORT=${sqlPort}`;
    } else if (demoTarget === 'dev' || demoTarget === 'local') {
      target = demoTarget;
      how = `DEMO_TARGET=${demoTarget}`;
    }
  }

  return {
    target, // local | dev
    label: target === 'dev' ? 'DEV' : 'LOCAL',
    stack: target === 'dev' ? 'post-demo' : 'pre-demo',
    backend: backend === 'fhir' ? 'fhir' : 'sql',
    sqlPort,
    fhirBaseUrl: fhirBase,
    how,
  };
}

module.exports = { resolveStackTarget };
