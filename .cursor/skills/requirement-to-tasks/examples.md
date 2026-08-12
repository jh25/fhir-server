# Example: Look up prior studies at check-in

Fuller breakdown produced by [requirement-to-tasks](SKILL.md). Regenerate for live
requirements; do not copy IDs blindly if gaps already closed.

## Dual restatement

- **Clinic:** At imaging check-in, the technician sees that patient’s prior studies only.
- **Tech:** Compartment search `GET /Patient/{id}/ImagingStudy` (+ demo stops reading FHIR tables via SQL).

## Diagnose

| Level | Status (typical post-remove / greenfield) |
|-------|-------------------------------------------|
| 1 Spec | ImagingStudy exists in R4 Firely + search/compartment JSON |
| 2 Codebase | May need const + FHIR-10 validator + unit/E2E (add-fhir A+B+C) |
| 3 Clinic | Demo often still `Design: SQL` until REST wired |

## Tasks

### T-1: Re-verify / restore ImagingStudy server wiring

| Field | Content |
|-------|---------|
| **Owner** | Eng+QA |
| **Depends on** | none |
| **Clinic outcome** | Server can store/return ImagingStudy for a patient |
| **Tech outcome** | A+B+C present or confirmed |

**Dev steps**

1. Run `/add-fhir-resource-type` fast path; create-if-missing after remove.
2. Do not edit HL7 `search-parameters.json` for ImagingStudy.

**QA automation (peer — define now)**

| Layer | Spec | Pattern |
|-------|------|---------|
| Unit | FHIR-10 reject/accept; no-op on Patient | `ImagingStudyRequiredFieldsValidatorTests` |
| E2E | Create 201; incomplete → 400; compartment scoped | `ImagingStudyTests` |
| Smoke | `GET /metadata` lists ImagingStudy | local-setup |

**Skills / patterns:** add-fhir-resource-type · FHIR-02 · FHIR-10

**Done when:** unit filter green; E2E builds (full E2E with host).

### T-2: Prove check-in compartment behavior

| Field | Content |
|-------|---------|
| **Owner** | Eng+QA |
| **Depends on** | T-1 |
| **Clinic outcome** | Open chart never shows another patient’s studies |
| **Tech outcome** | Compartment search asserted in E2E |

**Dev steps**

1. Ensure E2E covers two patients + one compartment query (already in ImagingStudyTests pattern).

**QA automation**

| Layer | Spec | Pattern |
|-------|------|---------|
| E2E | Patient A compartment excludes Patient B study | FHIR-01 compartment |
| Unit | — (do not retest HTTP in unit) | FHIR-02 scope |

**Skills / patterns:** FHIR-01 · FHIR-02 · strengthen-tests if thin

### T-3: Demo worklist uses FHIR REST

| Field | Content |
|-------|---------|
| **Owner** | Eng+QA |
| **Depends on** | T-2 |
| **Clinic outcome** | Check-in UI worklist matches open patient via API |
| **Tech outcome** | Demo calls FHIR HTTP; `#design-indicator` = `Design: FHIR` |

**Dev steps**

1. Replace SQL read in `midsizedclinic-demo-app` imaging path with FHIR client to compartment URL.
2. Single text change: `Design: SQL` → `Design: FHIR` on `#design-indicator`.

**QA automation**

| Layer | Spec | Pattern |
|-------|------|---------|
| Smoke | Load :3000; worklist rows; indicator shows FHIR | local-setup |
| Integration | Optional: demo → FHIR host round-trip | only if needed |

**Skills / patterns:** local-setup · FHIR-00 (no new SQL in Core) · design-indicator

### T-4: SDLC closeout

| Field | Content |
|-------|---------|
| **Owner** | Eng+QA |
| **Depends on** | T-3 |
| **Clinic outcome** | Safe to demo / PR |
| **Tech outcome** | Gates checked |

**Dev steps:** `/pre-review-patterns` · `/strengthen-tests` as needed · PR with test evidence.

**QA automation:** confirm gate checklist in skill SKILL.md §5.

## PM hand-off

```
Requirement: Look up prior studies at check-in
Tasks: T-1…T-4 (Eng+QA)
Blocked by: local FHIR host for E2E/smoke
Demo win: technician opens Alex → only Alex’s studies; Design: FHIR
Non-goals: PACS pixels; hard-delete; gutting HL7 search JSON
```
