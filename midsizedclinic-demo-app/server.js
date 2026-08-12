/**
 * MidSizedClinic Imaging Demo App — Express reference for VERA-1042.
 *
 * Learning tool only. The real Microsoft FHIR Server uses:
 * - Thin controllers → MediatR handlers (FHIR-00)
 * - IFhirDataStore (not raw SQL from Core/API)
 * - AuthorizationService + roles.json (not X-User-Role headers)
 * - BundleResourceContext audit pipeline (not console JSON)
 *
 * Clinic context: .cursor/skills/product-owner-overview/clinic-workflow.md (step 1)
 * Rules: FHIR-10 … FHIR-13 under .cursor/rules/
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const imagingRouter = require('./routes/imaging');
const patientsRouter = require('./routes/patients');
const { pingSql } = require('./db/pool');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/health', async (_req, res) => {
  try {
    const ok = await pingSql();
    if (ok) {
      res.status(200).json({ status: 'ok', sql: 'up' });
      return;
    }
    res.status(503).json({ status: 'degraded', sql: 'down' });
  } catch (err) {
    console.error('Health check SQL ping failed:', err.message);
    res.status(503).json({ status: 'degraded', sql: 'down' });
  }
});

// Worklist UI (learning demo) — static page calls the FHIR-shaped API below.
app.use(express.static(path.join(__dirname, 'public')));

app.use(patientsRouter);
app.use(imagingRouter);

app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).type('text/plain').send('Not found. Open / for the worklist UI.');
    return;
  }
  res.status(404).type('application/fhir+json').json({
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code: 'not-found',
        diagnostics: 'Not found. Try GET /, GET /health, or GET /Patient/{id}/ImagingStudy',
      },
    ],
  });
});

app.listen(port, async () => {
  console.log(`MidSizedClinic imaging demo listening on http://localhost:${port}`);
  try {
    await pingSql();
    console.log('SQL connectivity: up');
  } catch (err) {
    // Fail-fast visibility — process stays up so /health can report degraded.
    console.error('SQL connectivity: down —', err.message);
  }
});
