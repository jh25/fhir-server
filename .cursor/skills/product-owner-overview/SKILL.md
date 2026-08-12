---
name: product-owner-overview
description: >-
  Generates a live Canvas for MidSizedClinic Product Owners: what Fast Healthcare
  Interoperability Resources (FHIR) is and why the clinic uses it, how the imaging
  workflow maps to shipped FHIR Server capabilities, clinic-owned gaps, and real
  upstream microsoft/fhir-server backlog via GitHub MCP. Prefer clinic language
  over endpoints. Use when the user runs /product-owner-overview, or asks how
  FHIR fits the clinic workflow, what gaps remain, or what Microsoft still has
  open upstream.
disable-model-invocation: false
---

# Product Owner Overview — MidSizedClinic Fast Healthcare Interoperability Resources (FHIR) Server

Generate a live Canvas answering: **What is Fast Healthcare Interoperability
Resources (FHIR), why does MidSizedClinic use it, and what can we run today vs
still own as gaps?** Honest map of clinic workflow → product outcomes → shipped
capabilities → clinic gaps → real upstream Microsoft issues. Not a made-up
feature list.

**Audience:** Product Owner at MidSizedClinic (not engineers first)

They need: a plain-language Fast Healthcare Interoperability Resources (FHIR)
primer, how it fits imaging ops, which steps are ready, what the clinic still
owns, and what Microsoft still has open — so they can prioritize without reading
controllers.

On first mention in the Canvas, write **Fast Healthcare Interoperability Resources
(FHIR)** before using the acronym alone.

## Narrative Arc

1. **Clinic context** (ultrasound center, volume, HIPAA, roles)
2. **What is Fast Healthcare Interoperability Resources (FHIR) & why it is critical** (standard + clinic fit + business benefits — not a protocol lecture)
3. **Workflow** (arrive → capture → report → send → audit) in clinic language
4. **Can we run the clinic?** (each step: Ready / Needs clinic work / Waiting on Microsoft)
5. **Who can do what** (persona matrix first; platform role names secondary)
6. **What good looks like** (NFRs + success metrics in one strip)
7. **Upstream that matters to us** (clinic-outcome titles + GitHub issue links)
8. **For engineering** (collapsed deep links — optional)

One Canvas. **Never** list .cursorignore, skills, or rules. No made-up roadmap items.

## Altitude (PO-first)

Lead with **clinic outcomes and decisions**. Keep honesty (provenance, issue
numbers, shipped vs gap) but put implementation below the fold.

| Prefer | Avoid on the surface |
|--------|----------------------|
| "Look up prior studies at check-in" | Leading with `GET /Patient/{id}/ImagingStudy` |
| Ready / Needs clinic work / Waiting on Microsoft | Controller name lists in the intro |
| Persona: Technician / Radiologist | `globalWriter` / `dataActions` as the primary table |
| "Better audit trail for monthly HIPAA reviews" | Label dumps without clinic outcome |
| F-ids and endpoints in secondary/detail lines | Six-column tables of FHIR jargon |

## Source of Truth

| Layer | Source | Provenance |
|---|---|---|
| Clinic workflow | [clinic-workflow.md](clinic-workflow.md) | MidSizedClinic-owned |
| Shipped features | `src/`, `docs/`, [fhir-product-catalog.json](fhir-product-catalog.json) | Verified in this repo |
| Upstream backlog | `microsoft/fhir-server` via **GitHub MCP** | [upstream-sources.json](upstream-sources.json) |
| Official feature list | [Azure Healthcare APIs features doc](https://learn.microsoft.com/azure/healthcare-apis/fhir-features-supported) | Microsoft-published |

**Do not** invent F-xxx IDs or roadmap items. If not in codebase or upstream GitHub issues, label it **assumed clinic gap**.

## Fast Healthcare Interoperability Resources (FHIR) primer (required in Canvas)

Write three short beats in PO language (from clinic context + catalog — do not invent
vendor product claims). Lead with the full name once, then FHIR:

1. **What it is** — Fast Healthcare Interoperability Resources (FHIR), from HL7, is a common language for health data (patients, studies, reports) exchanged over standard APIs, so systems do not each invent a private format.
2. **Why MidSizedClinic uses it** — referrers' EHRs, imaging apps, and compliance tooling can talk to one clinical backbone instead of one-off interfaces; R4 REST + roles + SQL residency match clinic policy.
3. **How it fits our clinic** — FHIR stores the **clinical record** (Patient, ImagingStudy metadata, DiagnosticReport). Image pixels stay in PACS; FHIR holds the links, status, and who may access what.

Keep those three beats under ~120 words total. No resource-field dumps.

### Business benefits (required — same section)

Immediately after the three beats, show these **company outcomes** FHIR enables
(plain English; not endpoint lists). Use a short table or five compact cards:

| Benefit | PO language |
|---------|-------------|
| Automated prior authorizations | Faster authorizations with less staff chase-time when payers and referrers can consume the same clinical data |
| Instant claims eligibility & accurate copays | Eligibility and patient responsibility clearer before the visit — fewer surprise bills and denials |
| Comprehensive patient longitudinal records | Prior imaging, reports, and history in one longitudinal view instead of fax / phone / chart hunting |
| Plug-and-play third-party apps | SMART / FHIR apps connect without a custom interface project for every vendor |
| Seamless TEFCA & QHIN participation | Standard exchange posture so MidSizedClinic can join national networks (TEFCA / QHINs) without rebuilding our data model |

Then **one paragraph** (Callout or open prose) answering: **why this is critical for
MidSizedClinic as a company** — tie the five benefits together: imaging centers win
on speed-to-referrer, clean revenue cycle, trusted longitudinal history, partner
ecosystem, and network participation; FHIR is the shared language that makes those
possible without a private API for every partner.

## GitHub MCP Setup (required for upstream backlog)

Config lives in [.cursor/mcp.json](../../mcp.json) — read-only GitHub server with
`repos`, `issues`, `pull_requests`, `labels` toolsets.

**Server ID in Cursor:** may appear as `project-0-fhir-server-github`, not `github`.
Always run `GetMcpTools` with pattern `"github"` and use the returned server id in
`CallMcpTool`.

### One-time token setup

1. Create a fine-grained PAT at https://github.com/settings/tokens?type=beta
   - Repository access: **Public repositories**
   - Permissions: **Issues** (read), **Pull requests** (read), **Metadata** (read)
2. Set env var (Windows, user scope):
   ```powershell
   [System.Environment]::SetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', 'ghp_...', 'User')
   ```
3. **Restart Cursor** so MCP picks up the env var.
4. Verify:
   ```powershell
   .\.cursor\skills\product-owner-overview\scripts\verify-github-mcp.ps1
   ```
5. In Cursor: **Settings → Tools & MCP** — confirm `github` shows a green dot.

If MCP is unavailable, say so in chat and skip the upstream section — do not fabricate backlog data.

## GitHub MCP Workflow

Before generating the canvas:

```
1. GetMcpTools { "server": "github" }           — confirm server loaded
2. Read upstream-sources.json                     — query definitions
3. CallMcpTool github / list_issues             — VSTS-Backlog open issues
4. CallMcpTool github / search_issues             — New Feature + backlog milestone
5. For REQ gaps, search_issues per mappingRules   — link real issue numbers
6. issue_read on top 3–5 issues                   — user story + acceptance criteria if present
```

### MCP call examples

**Open Microsoft backlog:**
```json
{
  "server": "github",
  "toolName": "list_issues",
  "arguments": {
    "owner": "microsoft",
    "repo": "fhir-server",
    "state": "open",
    "labels": ["VSTS-Backlog"],
    "perPage": 30,
    "fields": ["title", "number", "labels", "state", "milestone", "html_url"]
  }
}
```

**Search feature requests:**
```json
{
  "server": "github",
  "toolName": "search_issues",
  "arguments": {
    "owner": "microsoft",
    "repo": "fhir-server",
    "query": "repo:microsoft/fhir-server is:issue is:open label:\"New Feature\"",
    "perPage": 20
  }
}
```

**Read issue body (user story / AB# links):**
```json
{
  "server": "github",
  "toolName": "issue_read",
  "arguments": {
    "owner": "microsoft",
    "repo": "fhir-server",
    "issue_number": 2490,
    "method": "get"
  }
}
```

Use exact tool names from `GetMcpTools` if they differ slightly from examples above.

For the Canvas upstream section: title each highlight by **clinic outcome**, then
link the issue. Put labels / acceptance criteria in a collapsible, not the primary row.

## Local Discovery Workflow

```
PO overview canvas generation:
- [ ] 0. Verify GitHub MCP (GetMcpTools) or run verify-github-mcp.ps1
- [ ] 1. Read clinic-workflow.md (extract workflow steps, roles, metrics)
- [ ] 2. Read fhir-product-catalog.json (shipped features + clinic requirements)
- [ ] 3. Fetch upstream backlog via GitHub MCP (upstream-sources.json queries)
- [ ] 4. Scan src/*/Controllers/ for actual endpoints (verify shipped — do not lead Canvas with them)
- [ ] 5. For each workflow step, write clinic outcome + status + gap
- [ ] 6. Map clinic REQ gaps to upstream issues where possible
- [ ] 7. Write Canvas per layout-spec (primer → workflow → readiness → personas → good looks like → upstream → eng fold)
- [ ] 8. Link Canvas; narrate in chat with provenance labels (clinic language)
```

Canvas path: `~/.cursor/projects/<workspace>/canvases/midsizedclinic-po-overview.canvas.tsx`

Layout: [layout-spec.md](layout-spec.md)

## Provenance Labels (use in Canvas and chat)

| Label | Meaning |
|---|---|
| **Ready** | Clinic can run this **outcome in production ops today** (staff + apps + process). Sample apps and demos do **not** count. |
| **Shipped (in repo)** | Controller + doc verified — engineering detail only; never auto-promote to Ready |
| **Upstream backlog** | Open issue on microsoft/fhir-server (cite #number + url) |
| **Clinic gap** / **Needs clinic work** | Outcome not production-ready for MidSizedClinic; we still own apps, config, or process |
| **Waiting on Microsoft** | Blocked or improved by an open upstream issue |
| **Assumed** | Narrative placeholder — flag explicitly, do not present as fact |

Default for "Can we run the clinic?" when unsure: **Needs clinic work**. Do not mark Ready because F-00x is shipped.

## Narrate in chat

Honest one-paragraph summary in **clinic language**: what FHIR is for MidSizedClinic,
what the workflow can do today, clinic-owned gaps, and Microsoft open items (issue
counts + numbers). Keep endpoints out of the chat summary unless asked.

Do **not** mention Cursor kit, .cursorignore, skills, or rules.

## Anti-patterns

- Listing .cursor/ files as product features
- Fabricating feature statuses without checking code or GitHub issues
- Marking a clinic outcome **Ready** just because the FHIR API is shipped — Ready means production clinic ops, not "works in a sample app"
- Inventing F-012/F-013-style roadmap IDs without upstream issue links
- Treating local-setup as a clinic product capability
- Copying interview-presentation kit inventory as clinic product features
- Proceeding with fake upstream data when GitHub MCP is down
- Leading with controllers, F-ids, or HTTP verbs before clinic outcomes
- Skipping the FHIR primer
