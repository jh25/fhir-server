/**
 * Console audit helper — FHIR-13 shape, identifiers only (no PHI).
 *
 * Learning note: the real FHIR server carries BundleResourceContext through
 * handlers → audit pipeline / persistent audit store. This demo logs JSON to stdout.
 */

const { randomUUID } = require('crypto');

/**
 * @param {{
 *   eventType?: string,
 *   userId?: string,
 *   role?: string|null,
 *   action?: string,
 *   resourceType?: string,
 *   patientCompartmentId?: string,
 *   outcome: 'success'|'denied',
 *   denialReason?: string,
 *   correlationId?: string,
 * }} event
 */
function auditAccess(event) {
  const record = {
    eventType:
      event.eventType ||
      (event.outcome === 'denied' ? 'imaging.access.denied' : 'imaging.access.success'),
    timestamp: new Date().toISOString(),
    userId: event.userId || 'anonymous',
    role: event.role || null,
    action: event.action || 'search',
    resourceType: event.resourceType || 'ImagingStudy',
    patientCompartmentId: event.patientCompartmentId,
    outcome: event.outcome,
    correlationId: event.correlationId || randomUUID(),
  };

  if (event.denialReason) {
    record.denialReason = event.denialReason;
  }

  // Never add patient names, findings, or resource bodies here (FHIR-01 / FHIR-13).
  console.log(JSON.stringify(record));
  return record;
}

module.exports = {
  auditAccess,
};
