# Canvas layout spec — Product Owner overview (MidSizedClinic FHIR Server)

One screen. Maps **MidSizedClinic's imaging workflow** to **actual FHIR Server capabilities**. 
Honest: here's what we do, here's what FHIR delivers, here's what's missing.

**Output path:** `~/.cursor/projects/<workspace>/canvases/midsizedclinic-po-overview.canvas.tsx`

## Title & Context

`H1`: MidSizedClinic FHIR Server — Workflow & Capabilities

Subtitle: *How our imaging clinic workflow aligns with FHIR Server capabilities.*

Clinic snapshot (from clinic-workflow.md):
- **What:** Mid-sized ultrasound imaging center, 50–100 encounters/week
- **Primary workflow:** Patient books → tech retrieves prior imaging → tech captures new study → radiologist reads + reports → clinic sends to referrer → compliance audits access
- **Compliance:** HIPAA. All PHI access authenticated and auditable.
- **Users:** Technician, radiologist, clinic admin, referring provider (via SMART), compliance officer

## 1. Workflow Overview

Timeline or flow diagram showing the 5 core workflow steps:
1. **Patient arrives** — retrieve demographics + prior imaging history
2. **Tech captures** — store new ImagingStudy
3. **Radiologist reads** — author DiagnosticReport
4. **Send to referrer** — export/share via FHIR API
5. **Audit** — compliance officer reviews access logs

## 2. Capability Map (Workflow → FHIR Feature → Status)

Table or cards (one per workflow step). Each row shows:

| Workflow Step | FHIR Capability | Endpoint/Doc | Status | Gap/Note |
|---|---|---|---|---|
| Retrieve prior imaging | Search (compartment) | `GET /Patient/{id}/ImagingStudy` | ✅ Shipped | Latency < 1s required; verify indexing |
| Store new study | CRUD (create) | `POST /ImagingStudy` | ✅ Shipped | Tech captures via app; FHIR stores metadata |
| Author report | CRUD (create) | `POST /DiagnosticReport` | ✅ Shipped | Radiologist creates report linked to study |
| Send to referrer | SMART on FHIR | Proxy or OIDC config | ✅ Shipped | Referrer launches app; fetches via secure FHIR calls |
| Audit access | Logging + roles | `docs/TelemetryLogging.md` | ⚠️ Partial | API calls logged; clinic needs runbook to generate monthly reports |

## 3. User Roles & Permissions

Card: Roles defined in `roles.json`. Matrix showing who can do what (read ImagingStudy, write DiagnosticReport, export, delete, etc.).

Example:
- **Technician**: read/write ImagingStudy, read Patient, cannot export
- **Radiologist**: read ImagingStudy, read/write DiagnosticReport, cannot delete
- **Compliance officer**: read-only logs, cannot access clinical data

## 4. Non-Functional Requirements

Bullet list (from clinic-workflow.md):
- Search latency: < 1 second
- Availability: 99% during clinic hours
- Data residency: On-premise SQL Server
- Audit trail: Every API call logged
- Bulk migration: Legacy data import without manual re-entry

Status: Which are met, which need work?

## 5. Success Metrics

Clinic's definition of success (from clinic-workflow.md):
- New technician productive in 2 hours
- Zero data loss during migration
- 100% PHI access captured in audit log
- Study lookup < 1 sec, report delivery < 5 min

## 6. Deep-dive Links

Section: "Learn more" → links to actual docs that implement each capability:
- `docs/SearchArchitecture.md` (search implementation)
- `docs/Roles.md` (roles definition)
- `docs/Authentication.md` (auth wiring)
- `docs/BulkImport.md` (data migration)
- `docs/SMARTonFHIR.md` (SMART integration)
- `docs/SchemaMigrationGuide.md` (production deployment)

No .cursor paths. No convention adherence charts. No measurements from interview kit.

## Anti-patterns

- Listing .cursorignore, skills, rules, or kit files as capabilities
- Fabricating feature statuses without checking codebase
- Treating local-setup as a clinic product feature
- Calling sections "Spec Kit" or "Cursor configuration" — this is the PRODUCT
