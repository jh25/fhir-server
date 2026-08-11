---
name: product-owner-overview
description: >-
  Generates a live Canvas showing how MidSizedClinic's imaging workflow maps to
  FHIR Server capabilities. Reads clinic-workflow.md (our workflow), discovers
  actual FHIR features from src/ controllers and docs/, and generates a Canvas:
  workflow step → FHIR capability → gap (if any). Honest integration of our
  clinical reality with what FHIR delivers.
disable-model-invocation: false
---

# Product Owner Overview — MidSizedClinic FHIR Server

Generate a live Canvas answering: **What FHIR capabilities enable MidSizedClinic's 
imaging workflow?** Not a made-up feature list — an honest map of our clinic 
workflow to real FHIR Server features we actually ship.

**Audience:** Product Owner at MidSizedClinic

They need to understand: What is our workflow? Which FHIR capabilities enable each 
step? Where are the gaps?

## Narrative Arc

1. **Clinic context** (MidSizedClinic — ultrasound center, 50–100 encounters/week, HIPAA-bound)
2. **Workflow steps** (patient booking → tech captures → radiologist reads → report to referrer → compliance audit)
3. **FHIR capabilities** (for each workflow step: which actual FHIR Server features enable it?)
4. **Gaps** (where workflow needs something FHIR doesn't yet deliver or clinic hasn't configured)
5. **User roles & permissions** (who can do what, enforced by roles.json)
6. **Success metrics** (ramp time, availability, audit, performance)

One Canvas. **Never** list .cursorignore, skills, or rules. No made-up features.

## Source of Truth

**Clinic workflow:** [clinic-workflow.md](clinic-workflow.md) — our documented imaging process

**FHIR capabilities:** Discover from actual repo:
- `src/.../Controllers/*.cs` — what endpoints exist?
- `docs/*.md` — what do they actually do?
- `src/.../roles.json` — what permissions exist?
- `docs/flow diagrams/` — architecture for each major feature

Example discovery:
- Workflow step: "Technician retrieves prior imaging history"
- Search: grep `ImagingStudyController`, read `docs/SearchArchitecture.md`
- Capability: `GET /Patient/{id}/ImagingStudy` exists (shipped)
- Implementation: FhirController + search indexing (both in codebase)

## Workflow

```
PO overview canvas generation:
- [ ] 1. Read clinic-workflow.md (extract workflow steps, roles, metrics)
- [ ] 2. Scan src/*/Controllers/ for actual endpoints
- [ ] 3. For each workflow step, find matching FHIR capability
- [ ] 4. Check docs/*.md for capability details (is it shipped or planned?)
- [ ] 5. Note gaps: "Workflow needs X, FHIR doesn't have it yet" (honest)
- [ ] 6. Write Canvas: workflow → capability → status → gap
- [ ] 7. Link Canvas; narrate in chat
```

Canvas path: `~/.cursor/projects/<workspace>/canvases/midsizedclinic-po-overview.canvas.tsx`

Layout: [layout-spec.md](layout-spec.md)

## Narrate in chat

Honest one-paragraph summary: MidSizedClinic is an ultrasound imaging center. 
Our workflow: tech retrieves prior imaging → captures new study → radiologist 
reads + reports → clinic sends to referrer → compliance audits access. FHIR 
Server delivers: search (find patients), CRUD (store studies/reports), auth 
(role-based access), bulk import (migration), audit logging (compliance). Gaps: 
[list any real gaps]. Canvas shows the full map.

Do **not** mention Cursor kit, .cursorignore, skills, or rules.

## Anti-patterns

- Listing .cursor/ files as product features
- Fabricating feature statuses without checking code
- Treating local-setup as a clinic product capability
- Copying interview-presentation measurements or conventions charts
