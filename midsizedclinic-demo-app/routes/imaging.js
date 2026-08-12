/**
 * GET /Patient/:patientId/ImagingStudy — MidSizedClinic tech worklist (VERA-1042 shape).
 *
 * Clinic workflow step 1: technician retrieves prior imaging studies for a patient.
 * See .cursor/skills/product-owner-overview/clinic-workflow.md
 *
 * Differs from the real .NET FHIR handler:
 * - Role via X-User-Role header vs AuthorizationService.CheckGetAccess / roles.json
 * - Proxies FHIR REST compartment search (lib/fhirClient) vs MediatR → IFhirDataStore
 * - Console audit vs BundleResourceContext audit pipeline
 */

const express = require('express');
const { auditAccess } = require('../middleware/audit');
const { searchImagingStudiesByPatient } = require('../lib/fhirClient');

const router = express.Router();

const ALLOWED_ROLES = new Set(['clinicTechnician', 'clinicRadiologist']);

function operationOutcome(severity, code, diagnostics) {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity,
        code,
        diagnostics,
      },
    ],
  };
}

router.get('/Patient/:patientId/ImagingStudy', async (req, res) => {
  const patientId = req.params.patientId;
  const role = req.get('X-User-Role');
  const userId = req.get('X-User-Id') || 'anonymous';

  if (!role || !ALLOWED_ROLES.has(role)) {
    auditAccess({
      userId,
      role: role || null,
      action: 'search',
      resourceType: 'ImagingStudy',
      patientCompartmentId: patientId,
      outcome: 'denied',
      denialReason: 'invalid_or_missing_role',
    });

    res
      .status(403)
      .type('application/fhir+json')
      .json(
        operationOutcome(
          'error',
          'forbidden',
          'X-User-Role must be clinicTechnician or clinicRadiologist',
        ),
      );
    return;
  }

  // FHIR-11: default worklist sort is newest-first; _sort=started ascending is allowed but rare.
  const sort = req.query._sort || '-started';
  if (sort !== '-started' && sort !== 'started') {
    res
      .status(400)
      .type('application/fhir+json')
      .json(
        operationOutcome(
          'error',
          'invalid',
          'Unsupported _sort. Use -started (default) or started.',
        ),
      );
    return;
  }

  let count = parseInt(String(req.query._count ?? '50'), 10);
  if (Number.isNaN(count) || count < 1) {
    count = 50;
  }
  count = Math.min(count, 100);

  const modality = req.query.modality ? String(req.query.modality) : null;

  try {
    const { status, body, resourceType } = await searchImagingStudiesByPatient({
      patientId,
      modality,
      sort,
      count,
    });

    if (status < 200 || status >= 300) {
      auditAccess({
        userId,
        role,
        action: 'search',
        resourceType: 'ImagingStudy',
        patientCompartmentId: patientId,
        outcome: 'denied',
        denialReason: 'fhir_upstream_error',
      });

      res
        .status(status)
        .type('application/fhir+json')
        .json(body.resourceType ? body : operationOutcome('error', 'exception', 'ImagingStudy search failed'));
      return;
    }

    // Pass through FHIR Bundle searchset — frontend reads entry[].resource (public/app.js).
    auditAccess({
      userId,
      role,
      action: 'search',
      resourceType: resourceType || 'Bundle',
      patientCompartmentId: patientId,
      outcome: 'success',
    });

    res.status(200).type('application/fhir+json').json(body);
  } catch (err) {
    // Log error message only — never serialize request bodies or resource JSON (PHI).
    console.error('ImagingStudy search failed:', err.message);

    auditAccess({
      userId,
      role,
      action: 'search',
      resourceType: 'ImagingStudy',
      patientCompartmentId: patientId,
      outcome: 'denied',
      denialReason: 'server_error',
    });

    res
      .status(500)
      .type('application/fhir+json')
      .json(operationOutcome('error', 'exception', 'ImagingStudy search failed'));
  }
});

module.exports = router;
