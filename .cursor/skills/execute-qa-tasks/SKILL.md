---
name: execute-qa-tasks
description: >-
  Guide QA through executing verification tasks for the MidSizedClinic demo app
  integration. Takes QA tasks (e.g., "Verify compartment search", "Test role
  access", "Verify FHIR compliance") and provides step-by-step verification
  guidance. References MidSizedClinic imaging rules: MIDSIZEDCLINIC-10 (API
  compartment search, required fields, FHIR responses), MIDSIZEDCLINIC-11 (search
  filtering, sorting, pagination), MIDSIZEDCLINIC-12 (workflow role boundaries),
  MIDSIZEDCLINIC-13 (audit logging enforced). Shows: how to test
  compartment-scoped searches, how to verify role-based access enforcement, how
  to smoke test FHIR compliance (responses, status codes, FHIR JSON shapes).
  Outcome: QA verifies demo works per spec, ready to merge. Audience: QA
  engineers testing clinic integration. Reference: MIDSIZEDCLINIC-10/11/12/13
  rules, clinic-workflow.md, FHIR-01/02 base rules. Use when verifying
  midsizedclinic-demo-app, QA'ing imaging worklist/compartment/role/audit
  behavior, or when the user names a demo-app QA task.
disable-model-invocation: false
---

# Execute MidSizedClinic demo-app QA tasks

Guide QA through executing verification tasks for the MidSizedClinic demo app
integration. Takes QA tasks (e.g., "Verify compartment search", "Test role
access", "Verify FHIR compliance") and provides step-by-step verification
guidance. References MidSizedClinic imaging rules: MIDSIZEDCLINIC-10 (API
compartment search, required fields, FHIR responses), MIDSIZEDCLINIC-11 (search
filtering, sorting, pagination), MIDSIZEDCLINIC-12 (workflow role boundaries),
MIDSIZEDCLINIC-13 (audit logging enforced). Shows: how to test
compartment-scoped searches, how to verify role-based access enforcement, how to
smoke test FHIR compliance (responses, status codes, FHIR JSON shapes). Outcome:
QA verifies demo works per spec, ready to merge. Audience: QA engineers testing
clinic integration. Reference: MIDSIZEDCLINIC-10/11/12/13 rules,
clinic-workflow.md, FHIR-01/02 base rules.

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

## Scope

| In scope | Out of scope |
|----------|--------------|
| Manual / curl / UI verification of `midsizedclinic-demo-app` against MidSizedClinic rules | Implementing features (use [execute-dev-tasks](../execute-dev-tasks/SKILL.md)) |
| Compartment search, roles, FHIR response shapes, audit smoke checks | Full .NET E2E suite ownership (point to FHIR-02 / strengthen-tests for server tests) |
| Pass/fail evidence ready for merge | Inventing product requirements |

**Demo vs server:** the demo teaches clinic contracts (VERA-1042 worklist shape).
It may use SQL or FHIR HTTP underneath — QA asserts the **HTTP contract and
rules**, not the internal SQL plan.

## Before verifying

```
QA task:
- [ ] 1. Restate the task + expected pass criteria
- [ ] 2. Environment up: demo :3000 health ok; seed data present; FHIR :8080 if required
- [ ] 3. Read FHIR-01/02 + MIDSIZEDCLINIC-10–13 for the task
- [ ] 4. Run verification steps; capture status codes + key JSON fields (no PHI)
- [ ] 5. Record Pass / Fail / Blocked with evidence
- [ ] 6. If Pass: ready to merge; if Fail: file gaps for execute-dev-tasks
```

### Environment

If stack is down → [local-setup](../local-setup/SKILL.md). Do not invent a stack.

- Demo: `http://localhost:3000` — `GET /health` → `{"status":"ok",...}`
- Seed ids (stable): `Patient/pat-1001` (own studies), `Patient/pat-1002` (other compartment)
- Headers used by demo: `X-User-Role` (`clinicTechnician` | `clinicRadiologist`), `X-User-Id` (opaque id)

```bash
cd midsizedclinic-demo-app && npm run seed   # if studies missing
curl -s http://localhost:3000/health
```

### Rules to load (Read tool)

| When | Path |
|------|------|
| Always (PHI) | `.cursor/rules/FHIR-01-phi-safety.mdc` |
| Always (test rigor) | `.cursor/rules/FHIR-02-testing-patterns.mdc` |
| API / compartment / responses | `.cursor/rules/MIDSIZEDCLINIC-10-imaging-api-patterns.mdc` |
| Filters / sort / page | `.cursor/rules/MIDSIZEDCLINIC-11-imaging-search-patterns.mdc` |
| Role boundaries / workflow | `.cursor/rules/MIDSIZEDCLINIC-12-imaging-workflow-patterns.mdc` |
| Audit | `.cursor/rules/MIDSIZEDCLINIC-13-imaging-audit-compliance.mdc` |
| Clinic steps | [clinic-workflow.md](../product-owner-overview/clinic-workflow.md) |

Optional code review depth: [pre-review-patterns](../pre-review-patterns/SKILL.md),
[strengthen-tests](../strengthen-tests/SKILL.md).

## Evidence rules (HIPAA)

- **SAFE to paste:** HTTP status, `resourceType`, Bundle `type`, entry counts, study ids, role header values, audit `outcome` / `denialReason` / `patientCompartmentId` / `correlationId`
- **NEVER paste:** patient names, MRNs, clinical findings, report text, or any PHI from fixtures if present

## Verification patterns

### A. Compartment-scoped search (MIDSIZEDCLINIC-10 / 11)

```bash
curl -s "http://localhost:3000/Patient/pat-1001/ImagingStudy?_sort=-started&_count=50" \
  -H "X-User-Role: clinicTechnician" -H "X-User-Id: qa-tech-1"
```

**Pass when:**

- Status **200**
- `resourceType` = `Bundle`, `type` = `searchset`
- Every `entry.resource` is `ImagingStudy` whose `subject` references `Patient/pat-1001` only
- No studies that belong only to `pat-1002`

**Cross-compartment sanity:** call the same path with `pat-1002` — results must not include `pat-1001` studies.

### B. Role-based access (MIDSIZEDCLINIC-12)

| Case | Request | Expect |
|------|---------|--------|
| Tech allowed | `X-User-Role: clinicTechnician` on worklist | 200 + Bundle |
| Radiologist allowed | `X-User-Role: clinicRadiologist` | 200 + Bundle |
| Missing role | no `X-User-Role` | **403** + `OperationOutcome` |
| Invalid role | `X-User-Role: admin` (or other) | **403** + `OperationOutcome` |

```bash
curl -s -i "http://localhost:3000/Patient/pat-1001/ImagingStudy" \
  -H "X-User-Id: qa-tech-1"
```

**Pass when:** deny path returns FHIR `OperationOutcome` (not a bare string), and console audit shows `outcome: denied` (see C).

### C. Audit logging (MIDSIZEDCLINIC-13)

Watch demo process stdout while running A/B.

**Pass when:**

- Success path logs identifiers only (`userId`, `role`, `action`, `resourceType`, `patientCompartmentId`, `outcome: success`, `correlationId`)
- Deny path logs `outcome: denied` + `denialReason` (e.g. `invalid_or_missing_role`)
- Log lines contain **no** patient name / MRN / findings

Note: demo audit is console JSON teaching the FHIR-13 shape; real server uses
`BundleResourceContext` — QA still asserts **no PHI** and success+deny coverage.

### D. FHIR compliance smoke (MIDSIZEDCLINIC-10 / 11)

| Check | How | Pass |
|-------|-----|------|
| Content type | Response `Content-Type` includes `application/fhir+json` (or JSON body is FHIR resource) | Yes |
| Bundle shape | `resourceType`, `type=searchset`, `entry[]` | Yes |
| Sort | `?_sort=-started` returns newest-first by `started` when multiple rows | Yes |
| Pagination bound | `?_count=100` ok; values above 100 capped ≤ 100 | Yes |
| Modality filter | `?modality=US` returns only US studies for that patient | Yes |
| Bad `_sort` | unsupported value → **400** + `OperationOutcome` | Yes |
| Health | `GET /health` → ok when SQL/demo ready | Yes |

```bash
curl -s "http://localhost:3000/Patient/pat-1001/ImagingStudy?modality=US&_sort=-started&_count=50" \
  -H "X-User-Role: clinicTechnician" -H "X-User-Id: qa-tech-1"
```

### E. UI smoke (optional)

Open `http://localhost:3000/` — select patient/role/modality; table shows only compartment-safe rows; no PHI dumped into browser console beyond identifiers.

## Task playbooks

### Verify compartment search

Run pattern A + cross-patient check. Cite MIDSIZEDCLINIC-10 compartment MUST/NEVER.

### Test role access

Run pattern B table end-to-end. Cite MIDSIZEDCLINIC-12 role separation.

### Verify FHIR compliance

Run pattern D table + one success Bundle inspection. Cite MIDSIZEDCLINIC-10 responses + MIDSIZEDCLINIC-11 filters.

### Verify audit logging

Run one success + one deny; confirm pattern C. Cite MIDSIZEDCLINIC-13 + FHIR-01.

## Report template (required in chat)

```
QA result: Pass | Fail | Blocked
Task: <verbatim task>
Environment: demo :3000 <ok/fail>; seed <ok/fail>; FHIR :8080 <ok/n/a/fail>
Checks:
- [ ] Compartment (MIDSIZEDCLINIC-10/11): ...
- [ ] Roles (MIDSIZEDCLINIC-12): ...
- [ ] FHIR smoke (10/11): ...
- [ ] Audit (MIDSIZEDCLINIC-13 / FHIR-01): ...
Evidence: <statuses + resourceTypes + counts — no PHI>
Merge: ready | not ready — <why>
Next: none | execute-dev-tasks (<gap>) | local-setup (<blocker>)
```

**Ready to merge** only when tasked checks are Pass and no PHI/audit gaps remain.

## Anti-patterns

- Claiming Pass without status code + Bundle/`OperationOutcome` evidence
- Pasting PHI into the QA report
- Skipping deny-path role tests
- Treating empty 200 as success for error cases
- Implementing fixes inside this skill (hand off to execute-dev-tasks)
- Skipping environment check when `/health` is down
