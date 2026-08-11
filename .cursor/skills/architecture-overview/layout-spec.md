# Canvas layout spec — architecture overview

One file, one screen, six sections (five arc + deep dives). Visual + reference — diagram first, link to real docs for depth. Never paste doc bodies into the Canvas.

**Output path** (overwrite every run):

`~/.cursor/projects/<workspace>/canvases/midsizedclinic-architecture.canvas.tsx`

Workspace folder on this machine: `d-code-fhir-server`.

**Imports:** only `cursor/canvas`. Default-export one component. Embed discovery + doc index inline — no `fetch()`.

## Title

`H1`: MidSizedClinic FHIR Server — Architecture Overview

Subtitle: system design through the kit lens — layers, request flow, persistence, PHI boundary. Links open real docs; nothing duplicated here.

Callout:

> Found X kit files, Y had metadata, Z inferred · N docs under docs/*.md (link to index)

## 1. Tech Stack & Core Patterns

`H2` + compact `Grid` or `Table` — one row per concern:

| Concern | Verified fact | Deep dive link |
|---------|---------------|----------------|
| Runtime | .NET SDK 10.0.302 (`global.json`), `net10.0` | `AGENTS.md` |
| FHIR | R4/R5/STU3 version-specific projects | `AGENTS.md` project table |
| Mediation | `Medino` — `IMediator` + `IRequestHandler<,>` (AGENTS.md still says MediatR; code uses Medino) | `GetResourceHandler.cs`, flow diagrams |
| Persistence | `IFhirDataStore` → `SqlServerFhirDataStore` or `CosmosFhirDataStore` | `IFhirDataStore.cs`, `SearchArchitecture.md` |
| Local dev | Docker + SQL via `local-setup` skill | `.cursor/skills/local-setup/SKILL.md` |

Each row gets an `Button` → `openFile` on the doc or code entry point. No invented stack items.

## 2. Layered Architecture

`H2` + three-column `Grid`:

| Layer | What it adds | Live inventory |
|-------|--------------|----------------|
| Upstream (main) | OSS Microsoft FHIR Server — API → Core → persistence | Fixed; cite `AGENTS.md` separation |
| Guardrails | PHI access boundary + index signal | `.cursorignore`, `.cursorindexingignore` counts |
| House way | Role skills + rules (when present) | skill names; rules count (0 → Planned gap) |

Optional small SVG via `computeDAGLayout`: upstream → guardrails → house way.

## 3. Request Lifecycle

`H2` + vertical step list (GET and POST variants as tabs or two compact columns).

**GET** (from `docs/flow diagrams/read-resource.md`):

Client → Middleware → `FhirController` → Mediator → `GetResourceHandler` → Authorization → `IFhirDataStore.GetAsync` → response

**POST** (from `docs/flow diagrams/create-resource.md`):

Same through handler; add ReferenceResolver → WrapperFactory → SearchIndexer → `UpsertAsync`

Link buttons to flow diagram markdown files and `FhirController.cs` / handler sources. Do not redraw full Mermaid in Canvas — summarize steps, link for diagram.

## 4. Data Flow & Integration

`H2` + two blocks:

**Persistence & search:** resource JSON → wrapper → search indices → SQL or Cosmos (link `SearchArchitecture.md`, `search-sql-server.md`, `search-cosmos-db.md`).

**Ingress/egress:** `$import` NDJSON (`BulkImport.md`), `$export` (`BulkExport.md`), REST CRUD (flow diagrams). PHI compliance boundary: runtime auth (`Authentication.md`) + agent access boundary (`.cursorignore`).

Callout if doc stale: flag `RunningTheProject.md` (still mentions net6.0).

## 5. The Kit's Role

`H2`: where rules, skills, and ignore policies plug into the developer workflow.

| Kit piece | Architectural job | Workflow moment |
|-----------|-------------------|-----------------|
| `.cursorignore` | PHI firewall for agents | Before code/context touches Patient paths |
| `.cursorindexingignore` | Keeps search on house code | During exploration / codegen |
| Skills | Runnable architecture adoption | Onboarding, local env, stakeholder views |
| Rules | Encode layering conventions | Every edit (Planned if 0 .mdc) |

Map discovered skills to workflow moments. Pills for extras.

## 6. Where to Go for Deep Dives

`H2` + `Table` or card grid — curated index only:

| Topic | Path | Note |
|-------|------|------|
| Project conventions | `AGENTS.md` | Layers, testing, ADR location |
| Search & persistence | `docs/SearchArchitecture.md` | Extraction → persistence → query |
| Auth & security | `docs/Authentication.md` | Runtime identity |
| Request flows | `docs/flow diagrams/*.md` | 9 Mermaid diagrams |
| ADRs | `docs/arch/Readme.md` | 24 decision records |
| SQL schema | `docs/SchemaMigrationGuide.md` | Migrations |
| Gaps | `docs/RunningTheProject.md` | Stale — net6.0 reference |

Each row: `Button` openFile. Close with Callout: no `docs/architecture.md` exists — this Canvas + AGENTS.md + flow diagrams are the map.

## Design constraints

- Reference, don't recreate — max 2 sentences per doc in Canvas body
- `useCanvasAction` openFile for every deep dive
- Colors from `useHostTheme()` only
- Flag sparse/stale docs explicitly (valuable signal)
- One Canvas, ~20-minute review fit
