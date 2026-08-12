# Canvas layout spec — Product Owner overview (MidSizedClinic Fast Healthcare Interoperability Resources (FHIR) Server)

One screen for a **Product Owner**: what Fast Healthcare Interoperability Resources (FHIR) is, how it fits imaging ops, what
we can run today, what we still own, what Microsoft still has open.

Honest provenance. Clinic language on the surface. Engineering detail folded.

**Output path:** `~/.cursor/projects/<workspace>/canvases/midsizedclinic-po-overview.canvas.tsx`

## Title & Clinic context

`H1`: MidSizedClinic — Imaging workflow on Fast Healthcare Interoperability Resources (FHIR)

Subtitle: *What FHIR is, how it fits our clinic, and what is ready vs still open.*

Clinic snapshot card (from clinic-workflow.md):
- **What:** Mid-sized ultrasound imaging center, 50–100 encounters/week
- **Primary workflow:** Patient books → tech retrieves prior imaging → tech captures new study → radiologist reads + reports → clinic sends to referrer → compliance audits access
- **Compliance:** HIPAA. All PHI access authenticated and auditable.
- **Users:** Technician, radiologist, clinic admin, referring provider (via SMART), compliance officer

## 1. What is Fast Healthcare Interoperability Resources (FHIR) & why it is critical

**A. Primer — three short cards** (≤ ~120 words total):

| Beat | Content |
|------|---------|
| What it is | Common language for health data (patients, studies, reports) over standard APIs |
| Why we use it | One clinical backbone for referrer EHRs, imaging apps, and compliance — not one-off interfaces; matches on-prem SQL + role policy |
| How it fits | FHIR holds the clinical record and access; PACS holds image pixels; clinic apps talk FHIR |

**B. Business benefits — required table or five compact cards:**

1. Automated prior authorizations (time savings)
2. Instant claims eligibility & accurate copays
3. Comprehensive patient longitudinal records
4. Plug-and-play third-party apps
5. Seamless participation in TEFCA and QHINs

**C. Company-critical paragraph** — one Callout tying A+B together: why FHIR is
strategic for MidSizedClinic (speed, revenue cycle, longitudinal care, partners,
national network readiness) — not five disconnected slogans.

No resource schemas. Optional one-line link to Microsoft’s supported-features doc.

## 2. Workflow overview

Timeline / DAG of the 5 steps in **clinic language** (no POST/GET in the node labels):

1. Patient arrives — confirm identity + prior imaging
2. Tech captures — record the new ultrasound study
3. Radiologist reads — sign the report
4. Send to referrer — deliver results to the ordering provider
5. Compliance audit — who accessed what, when

Optional compact table: Step | Who | What they need (clinic words).

## 3. Can we run the clinic?

Primary decision table. Lead columns:

| Clinic outcome | Status | What it means | Gap / next step |
|----------------|--------|---------------|-----------------|
| Look up prior studies at check-in | Needs clinic work | Sample app only — not production check-in | Clinic worklist + real load |
| Store new ultrasound study | Needs clinic work | Server can store; capture app not live | Wire tech capture → FHIR |
| Author & sign report | Needs clinic work | Server can store reports; reporting UI not live | Radiologist app |
| Referrer gets results securely | Needs clinic work | SMART/OAuth not clinic-configured | Portal vs EHR decision + launch |
| Monthly HIPAA access review | Needs clinic work | Logs exist; no monthly runbook | Audit report process (+ track #2611) |
| Migrate 15 years of legacy records | Needs clinic work | $import exists; cutover not rehearsed | Migration runbook |

**Status vocabulary (surface):** Ready · Needs clinic work · Waiting on Microsoft  

**Critical:** "Shipped in repo" ≠ **Ready**. Ready means MidSizedClinic can run that outcome in **production clinic ops** today (staff + apps + process). A sample app, local demo, or unused API does **not** count as Ready. Keep F-ids and endpoints out of this table.

Stats strip above the table: Ready count · Needs clinic work · Waiting on Microsoft.

Secondary (optional `CollapsibleSection` “Engineering detail”): capability id, endpoint, doc path — for drill-down only.

Doc open buttons may live inside that fold, not as the main CTA row under the table.

## 4. Who can do what

**Primary:** clinic persona matrix (Technician, Radiologist, Clinic admin, Referring provider, Compliance officer) — Can / Cannot from clinic-workflow.md.

**Secondary:** short callout that IT maps personas to platform roles (`roles.json`) — do not lead with `globalWriter` / `dataActions`. Optional collapsed table for platform role names if useful for IT follow-up.

## 5. What good looks like

One section combining NFRs + success metrics (not two separate tech tables):

- Search at check-in < 1s · Report to referrer < 5 min · 99% clinic-hours uptime
- On-premise SQL · every PHI access auditable · legacy migration without manual re-entry
- New tech productive in ≤ 2 hours · zero migration data loss · monthly audit finds zero unauthorized access

Mark Met / Target / Clinic-owned process where known.

## 6. Upstream that matters to us

**Only when GitHub MCP returned data.** Do not invent items.

Lead with summary: "N open Microsoft backlog items, M New Feature requests (fetched `<date>`)."

Then **clinic-outcome cards or a short table**:

| Why it matters to us | Issue | Status |
|----------------------|-------|--------|
| Stronger audit trail for monthly HIPAA reviews | [#2611](…) | Upstream backlog |

3–5 highlights max. Collapsible under each: user story / acceptance if present.

Clinic gaps with no upstream hit: list plainly as **Clinic gap** (portal launch, cutover runbook, US Core config, etc.).

Official Microsoft feature list link (docs, not GitHub).

## 7. For engineering (folded)

`CollapsibleSection` or compact footer: links to `docs/SearchArchitecture.md`, `Roles.md`, `Authentication.md`, `BulkImport.md`, `SMARTonFHIR.md`, `TelemetryLogging.md`, `SchemaMigrationGuide.md`.

Label the section so a PO can skip it.

## Anti-patterns

- Leading with controllers, F-ids, or HTTP verbs
- Skipping the FHIR primer
- Listing .cursorignore, skills, rules, or kit files as capabilities
- Fabricating feature statuses without checking codebase / GitHub
- Treating local-setup as a clinic product feature
- Wall of identical cards for every section
- Dumping full upstream backlog — clinic-relevant highlights only
