---
name: architecture-overview
description: >-
  Generates a live Canvas showing Microsoft FHIR Server system architecture for
  MidSizedClinic Solutions Architects and tech leads: system context, layered
  design (Api → Core → Persistence), request lifecycle, search & data model,
  and cross-cutting concerns (auth, bulk ops, schema, ADRs). Links to real docs
  (AGENTS.md, docs/*.md, flow diagrams, code entry points) instead of
  duplicating them. Use when the user runs /architecture-overview, says "show
  me the architecture", or asks how this system works, how requests flow, where
  data persists, or how authorization is enforced.
disable-model-invocation: false
---

# Architecture Overview

Generate a live, auto-updating Canvas for a ~20-minute FHIR Server architecture
review. Visual + reference: show system layers and request flow in the Canvas,
then link to real docs for depth — never paste doc bodies here.

**Audience:** Solutions Architect or tech lead joining MidSizedClinic

They need the real Microsoft FHIR Server design: layered code (Api → Core →
Persistence), tech stack (.NET, Medino handlers, SQL/Cosmos via
`IFhirDataStore`), request lifecycle, search model, and runtime security —
framed as MidSizedClinic's clinical data platform. Kit / Cursor homework
storytelling belongs in [interview-presentation](../interview-presentation/SKILL.md),
not here.

## Narrative Arc (fixed — do not add sections)

1. System Context (MidSizedClinic clinical data platform + FHIR stack facts)
2. Layered Design (Api → Core → Persistence → Infrastructure)
3. Request Lifecycle (GET / POST / search: routing → mediator → handler → store)
4. Search & Data Model (extract → normalize → persist → query; SQL vs Cosmos)
5. Cross-Cutting Concerns (authz, bulk import/export, schema migrations, ADRs)
6. Where to Go for Deep Dives (AGENTS.md, docs/*.md, codebase entry points, gaps)

Section 6 is required — it is the "link out" index, not a sixth story beat.
One Canvas per invocation.

**Clinic note (section 1 only):** One short sentence that MidSizedClinic uses
this server as its FHIR clinical data platform (imaging / patient workflow).
Do not expand into kit layers, ignore policies, or interview demo content.
Product-owner workflow detail lives in
[product-owner-overview](../product-owner-overview/SKILL.md).

## Design Principle

Reference, don't recreate. Max two sentences per doc in the Canvas body; use
`Button` + `openFile` for everything else. Example framing: *"Persistence
abstracts behind IFhirDataStore — see SearchArchitecture.md for the full
extraction → query story."*

Full layout: [layout-spec.md](layout-spec.md). Curated doc paths:
[doc-index.json](doc-index.json).

## Workflow (every invocation — live)

```
Architecture overview:
- [ ] 1. Count docs (docs/*.md, flow diagrams, ADRs)
- [ ] 2. Verify tech stack claims against repo (Medino, IFhirDataStore, backends)
- [ ] 3. Map architecture into arc buckets
- [ ] 4. Write/overwrite Canvas with doc links
- [ ] 5. Narrate verified facts + flag stale/missing docs
```

### 1. Count docs

From the **repo root**, gather counts (for the deep-dives callout only):

| Class | Globs / paths |
|-------|----------------|
| Docs | `docs/**/*.md` (exclude `docs/rest/**` noise if helpful) |
| Flow diagrams | `docs/flow diagrams/*.md` |
| ADRs | `docs/arch/**/*.md` (note proposals separately if present) |

Do **not** discover kit files (`.cursorignore`, rules, skills) for this Canvas.

### 2. Verified architecture facts (check before writing)

These were confirmed against this repo — update if upstream changes:

| Claim | Verified where |
|-------|----------------|
| .NET SDK 10.0.302, `net10.0` | `global.json`, `Directory.Build.props` |
| FHIR R4/R5/STU3 version projects | `AGENTS.md` project table |
| Medino `IMediator` + handlers | `FhirController.cs`, `GetResourceHandler.cs` (`using Medino`) |
| AGENTS.md says MediatR | Stale label — code namespace is **Medino**, same Request/Handler pattern |
| `IFhirDataStore` abstraction | `src/.../Persistence/IFhirDataStore.cs` |
| SQL + Cosmos implementations | `SqlServerFhirDataStore.cs`, `CosmosFhirDataStore.cs` |
| GET/POST/search flows | `docs/flow diagrams/read-resource.md`, `create-resource.md`, `search-api.md` |
| Search pipeline | `docs/SearchArchitecture.md` |
| No `docs/architecture.md` | Absent — narrate the gap |
| `RunningTheProject.md` stale | Still mentions net6.0 |

### 3. Map into the arc

| Section | Source |
|---------|--------|
| System context | One clinic sentence + verified stack + `doc-index.json` |
| Layered design | `AGENTS.md` Api → Core → SqlServer/Cosmos; project table |
| Request lifecycle | Flow diagram steps (summarized) + controller/handler links |
| Search & data model | SearchArchitecture + SQL/Cosmos search flow diagrams |
| Cross-cutting | Authentication, BulkImport/Export, SchemaMigrationGuide, ADR index |
| Deep dives | Full `doc-index.json` table + stale/missing doc callouts |

### 4. Write the Canvas

- Path: `~/.cursor/projects/<workspace>/canvases/midsizedclinic-architecture.canvas.tsx`
- Layout: [layout-spec.md](layout-spec.md)
- Every deep dive gets `useCanvasAction` → `openFile`
- Read the canvas skill if unsure about `cursor/canvas` APIs

### 5. Narrate in chat (required)

> Verified stack: .NET / Medino / IFhirDataStore (SQL + Cosmos) · N docs, F flow diagrams, A ADRs under docs/

One sentence on the biggest doc gap (no architecture.md, or stale RunningTheProject).
Link the Canvas with absolute path markdown.

## Key Constraints

- **DO NOT recreate docs** — link them
- Cover: system context, code layers, request flow, search/persistence, auth, bulk ops, ADR index
- **No kit narrative** — no `.cursorignore` / rules / skills inventory; defer to interview-presentation
- **One Canvas**, ~20-minute review
- Flag sparse/stale docs — that is valuable signal

## Known Limits

If docs are sparse or outdated, say so in the Canvas stale-docs callout. Refresh
`doc-index.json` when new first-class architecture docs land.

## Anti-patterns

- Pasting SearchArchitecture or ADR text into the Canvas
- Inventing a persistence story not in repo docs/code
- Hiding the Medino vs MediatR naming mismatch
- Framing layers as upstream → guardrails → house way (that is interview-presentation)
- Discovering kit files or adding a "Kit's Role" section
- Treating `.cursorignore` as the compliance / PHI architecture story
- Skipping the deep-dives section
