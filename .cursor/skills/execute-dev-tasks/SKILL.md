---
name: execute-dev-tasks
description: >-
  Guide developers through executing development tasks on the MidSizedClinic demo
  app. Takes dev tasks (e.g., "Wire worklist to FHIR REST", "Update health
  endpoint", "Swap SQL to API calls") and provides step-by-step implementation
  guidance. Enforces MidSizedClinic imaging rules: MIDSIZEDCLINIC-10 (API
  patterns: compartment search, required ImagingStudy fields, FHIR responses),
  MIDSIZEDCLINIC-11 (search: compartment-bound, modality/date filters, sorting,
  pagination), MIDSIZEDCLINIC-12 (workflow: role separation, status transitions),
  MIDSIZEDCLINIC-13 (audit logging via BundleResourceContext, no PHI in logs).
  Shows: how to modify Express routes to call FHIR server, how to pass
  compartment context, how to ensure FHIR compliance. Outcome: demo code is
  ready for QA verification. Audience: developers extending the demo app.
  Reference: MIDSIZEDCLINIC-10/11/12/13 rules, local-setup skill, FHIR-00/01/02
  base rules. Use when implementing or refactoring midsizedclinic-demo-app,
  wiring Express to FHIR REST, or when the user names a demo-app dev task.
disable-model-invocation: false
---

# Execute MidSizedClinic demo-app dev tasks

Guide developers through executing development tasks on the MidSizedClinic demo
app. Takes dev tasks (e.g., "Wire worklist to FHIR REST", "Update health
endpoint", "Swap SQL to API calls") and provides step-by-step implementation
guidance. Enforces MidSizedClinic imaging rules: MIDSIZEDCLINIC-10 (API
patterns: compartment search, required ImagingStudy fields, FHIR responses),
MIDSIZEDCLINIC-11 (search: compartment-bound, modality/date filters, sorting,
pagination), MIDSIZEDCLINIC-12 (workflow: role separation, status transitions),
MIDSIZEDCLINIC-13 (audit logging via BundleResourceContext, no PHI in logs).
Shows: how to modify Express routes to call FHIR server, how to pass
compartment context, how to ensure FHIR compliance. Outcome: demo code is ready
for QA verification. Audience: developers extending the demo app.
Reference: MIDSIZEDCLINIC-10/11/12/13 rules, local-setup skill, FHIR-00/01/02
base rules.

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

## Scope

| In scope | Out of scope |
|----------|--------------|
| `midsizedclinic-demo-app/**` (Express, routes, db helpers, audit middleware, public UI) | New .NET handlers in `src/` (use architecture patterns + FHIR-00; not this skill) |
| Calling FHIR REST on `http://localhost:8080` from the demo | Replacing the Microsoft FHIR Server |
| Making demo responses FHIR-shaped and rule-compliant | Inventing clinic product roadmap |

**Stack reminder:** demo is a learning shim. Real server path is thin controller →
**Medino** handler → `IFhirDataStore` (AGENTS.md may still say MediatR). Demo may
call FHIR HTTP **or** SQL for teaching — prefer FHIR REST when the task says
“wire to FHIR” / “swap SQL to API.”

## Before coding

```
Dev task:
- [ ] 1. Restate the task + acceptance in one sentence
- [ ] 2. Confirm environment (local-setup): FHIR :8080 metadata 200, demo :3000
- [ ] 3. Read applicable rules (always FHIR-00/01/02; imaging → MIDSIZEDCLINIC-10–13)
- [ ] 4. Locate touch points under midsizedclinic-demo-app/
- [ ] 5. Implement + verify (curl / browser)
- [ ] 6. Hand off: ready for QA ([execute-qa-tasks](../execute-qa-tasks/SKILL.md); optionally pre-review-patterns + strengthen-tests)
```

### Environment

If FHIR or the demo is down → run [local-setup](../local-setup/SKILL.md) first.
Do not invent a stack.

- FHIR: `http://localhost:8080` (Docker often `FHIRServer__Security__Enabled=false`)
- Demo: `http://localhost:3000` — `midsizedclinic-demo-app/`
- Seed: `cd midsizedclinic-demo-app && npm run seed` when ImagingStudy demo rows missing

### Rules to load (Read tool — do not paraphrase away MUST/NEVER)

| When | Path |
|------|------|
| Always | `.cursor/rules/FHIR-00-architecture-patterns.mdc` |
| Always | `.cursor/rules/FHIR-01-phi-safety.mdc` |
| Always (tests) | `.cursor/rules/FHIR-02-testing-patterns.mdc` |
| Imaging / worklist / reports | `.cursor/rules/MIDSIZEDCLINIC-10-imaging-api-patterns.mdc` |
| Search / filters / sort / page | `.cursor/rules/MIDSIZEDCLINIC-11-imaging-search-patterns.mdc` |
| Capture → report lifecycle | `.cursor/rules/MIDSIZEDCLINIC-12-imaging-workflow-patterns.mdc` |
| Audit / access logs | `.cursor/rules/MIDSIZEDCLINIC-13-imaging-audit-compliance.mdc` |

Clinic narrative (optional): [clinic-workflow.md](../product-owner-overview/clinic-workflow.md).

## Demo app map

| Path | Role |
|------|------|
| `midsizedclinic-demo-app/server.js` | Express entry, mounts routes |
| `midsizedclinic-demo-app/routes/imaging.js` | `GET /Patient/:patientId/ImagingStudy` (VERA-1042 shape) |
| `midsizedclinic-demo-app/routes/patients.js` | Patient-facing demo routes |
| `midsizedclinic-demo-app/db/*.js` | SQL helpers (swap target when moving to FHIR HTTP) |
| `midsizedclinic-demo-app/middleware/audit.js` | Identifier-only audit (FHIR-13 teaching shape) |
| `midsizedclinic-demo-app/public/` | Browser UI |

## Implementation patterns

### A. Modify Express routes to call the FHIR server

1. Prefer `fetch`/`http` to FHIR base URL from env (e.g. `FHIR_BASE_URL=http://localhost:8080`) — never hardcode secrets.
2. For worklist prior studies, call compartment search:

```http
GET {FHIR_BASE_URL}/Patient/{patientId}/ImagingStudy?_sort=-started&_count=50
Accept: application/fhir+json
```

3. Map FHIR `Bundle` `type=searchset` through to the client — do not invent a private JSON shape when the task is FHIR compliance.
4. On FHIR errors, surface `OperationOutcome` (or wrap diagnostics) with the correct HTTP status — do not return empty 200 for failures.
5. Keep role gate (`X-User-Role`: `clinicTechnician` / `clinicRadiologist`) until real auth is wired; deny with audit (MIDSIZEDCLINIC-13).

### B. Pass compartment context

- **ALWAYS** scope imaging reads by patient: path `/Patient/{id}/ImagingStudy` or equivalent required `patient` filter.
- **NEVER** add a technician worklist that lists all ImagingStudy resources across patients.
- Propagate `patientId` from route → FHIR call → audit `patientCompartmentId`.
- Failed wrong-compartment / forbidden attempts **MUST** be audited as `outcome: denied` (no PHI in the log).

### C. Ensure FHIR / MidSizedClinic compliance

Checklist before claiming done:

| Rule | Check |
|------|--------|
| MIDSIZEDCLINIC-10 | Compartment route; ImagingStudy create/update has status, modality, started, description, subject; FHIR Bundle / OperationOutcome responses |
| MIDSIZEDCLINIC-11 | Patient scope + optional `modality` / `started` / `status`; `_sort=-started`; `_count` ≤ 100 |
| MIDSIZEDCLINIC-12 | Tech vs radiologist actions separated; status transitions match clinic workflow; reports link to studies |
| MIDSIZEDCLINIC-13 | Success **and** deny audits; identifiers only (userId, role, action, resourceType, resourceId, patientCompartmentId, correlationId) — **never** names/MRN/findings |
| FHIR-01 | No PHI in logs or exception messages |
| FHIR-00 | Demo may stay Express; do not teach raw SQL as the pattern for `.NET` Core/API |

### D. Audit logging (demo vs real server)

- **Demo:** use / extend `middleware/audit.js` — JSON to stdout, FHIR-13 field shape, identifiers only.
- **Real server (when teaching):** handlers carry `BundleResourceContext` into `IFhirDataStore` — say that explicitly; do not pretend console audit **is** BundleResourceContext.
- **NEVER** log patient name, MRN, clinical narrative, or report text.

## Task playbooks (common asks)

### Wire worklist to FHIR REST

1. Read `routes/imaging.js` + `db/imagingStudies.js`.
2. Replace SQL search with HTTP compartment GET to `:8080` (keep query params: modality, started, status, `_sort`, `_count`).
3. Preserve role checks + audit success/deny.
4. Verify:

```bash
curl -s "http://localhost:3000/Patient/pat-1001/ImagingStudy" \
  -H "X-User-Role: clinicTechnician" -H "X-User-Id: tech-1"
```

Expect Bundle `searchset`, only that patient’s studies.

### Swap SQL to API calls

1. Inventory `db/*.js` usages from routes.
2. For each read/write, choose the FHIR interaction (GET/POST/PUT search).
3. Remove or gate SQL helpers once unused — leave a short comment pointing at FHIR REST.
4. Re-seed not required if using FHIR-created resources; otherwise `npm run seed` still valid for baseline ids.

### Update health endpoint

1. Find health/ready route in `server.js` (or add `/health`).
2. Optionally probe FHIR `/metadata` — report demo + FHIR status without PHI.
3. Return simple JSON `{ status, fhir? }` — not a FHIR resource unless asked.

## Verify → QA handoff

**Done means:**

1. Task acceptance met with live curl or UI check recorded in chat.
2. MIDSIZEDCLINIC-10–13 checklist above checked for touched paths.
3. No PHI in new logs.
4. Point QA to [execute-qa-tasks](../execute-qa-tasks/SKILL.md). Optionally run
   [pre-review-patterns](../pre-review-patterns/SKILL.md) / [strengthen-tests](../strengthen-tests/SKILL.md)
   for deeper review.

Do **not** claim production FHIR Server readiness from demo-only changes.

## Anti-patterns

- Cross-patient ImagingStudy lists for tech worklist
- Private JSON instead of Bundle / OperationOutcome when the contract is FHIR
- PHI in `console.log` / audit payloads
- Skipping deny audits
- Editing `src/Microsoft.Health.Fhir.*` under this skill without an explicit .NET task
- Running without confirming `:8080` when the task depends on FHIR REST
