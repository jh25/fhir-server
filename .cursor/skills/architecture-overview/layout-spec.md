# Canvas layout spec — architecture overview

One file, one screen, six sections (five arc + deep dives). Visual + reference —
diagram first, link to real docs for depth. Never paste doc bodies into the Canvas.

**Output path** (overwrite every run):

`~/.cursor/projects/<workspace>/canvases/midsizedclinic-architecture.canvas.tsx`

Workspace folder on this machine: `d-code-fhir-server`.

**Imports:** only `cursor/canvas`. Default-export one component. Embed verified
facts + doc index inline — no `fetch()`.

## Title

`H1`: MidSizedClinic — FHIR Server Architecture

Subtitle: system design — layers, request flow, search & persistence, security.
Links open real docs; nothing duplicated here.

Callout:

> Verified: .NET / Medino / IFhirDataStore · N docs · F flow diagrams · A ADRs

## 1. System Context

`H2` + short intro (max two sentences):

- MidSizedClinic uses Microsoft FHIR Server as its clinical data platform
  (patient / imaging workflow data over FHIR REST).
- Stack facts in a compact `Grid` or `Table`:

| Concern | Verified fact | Deep dive link |
|---------|---------------|----------------|
| Runtime | .NET SDK 10.0.302 (`global.json`), `net10.0` | `AGENTS.md` |
| FHIR | R4/R5/STU3 version-specific projects | `AGENTS.md` project table |
| Mediation | `Medino` — `IMediator` + `IRequestHandler<,>` (AGENTS.md still says MediatR; code uses Medino) | `GetResourceHandler.cs`, flow diagrams |
| Persistence | `IFhirDataStore` → `SqlServerFhirDataStore` or `CosmosFhirDataStore` | `IFhirDataStore.cs`, `SearchArchitecture.md` |
| Local dev | Docker + SQL via `local-setup` skill | `.cursor/skills/local-setup/SKILL.md` |

Each row gets a `Button` → `openFile` on the doc or code entry point. No invented stack items.
Do not inventory kit rules/skills here.

## 2. Layered Design

`H2` + four-row stack (or vertical list) — **code layers**, not kit layers:

| Layer | Responsibility | Where |
|-------|----------------|-------|
| Api | REST controllers, filters, HTTP surface | `src/Microsoft.Health.Fhir.Api/`, Shared.Api `FhirController` |
| Core | Domain logic, Medino requests/handlers, authz checks | `src/Microsoft.Health.Fhir.Core/`, Shared.Core handlers |
| Persistence | `IFhirDataStore` implementations | `SqlServer/`, `CosmosDb/` |
| Infrastructure | Schema, migrations, hosting, Azure wiring | Schema under SqlServer; version projects |

Optional small SVG via `computeDAGLayout`: Api → Core → Persistence (SQL | Cosmos).

Cite `AGENTS.md`: API → Business Logic → Data Access → Infrastructure. Never label
these as upstream / guardrails / house way.

## 3. Request Lifecycle

`H2` + vertical step list (GET, POST, and search as tabs or three compact columns).

**GET** (from `docs/flow diagrams/read-resource.md`):

Client → Middleware → `FhirController` → Mediator → `GetResourceHandler` → Authorization → `IFhirDataStore.GetAsync` → response

**POST** (from `docs/flow diagrams/create-resource.md`):

Same through handler; add ReferenceResolver → WrapperFactory → SearchIndexer → `UpsertAsync`

**Search** (from `docs/flow diagrams/search-api.md`):

Client → Controller → search pipeline → SQL or Cosmos search path → Bundle response

Link buttons to flow diagram markdown files and `FhirController.cs` / handler sources.
Do not redraw full Mermaid in Canvas — summarize steps, link for diagram.

## 4. Search & Data Model

`H2` + two blocks:

**Pipeline:** resource JSON → FHIRPath extraction → normalized `ISearchValue` →
persistence → query (`SearchArchitecture.md`).

**Backends:** SQL search path (`search-sql-server.md`) vs Cosmos
(`search-cosmos-db.md`); shared abstraction remains `IFhirDataStore`.

Callout if doc stale: flag `RunningTheProject.md` (still mentions net6.0).

## 5. Cross-Cutting Concerns

`H2` + compact `Grid` or `Table`:

| Concern | What to know | Deep dive |
|---------|--------------|-----------|
| Authentication | Runtime JWT / identity | `docs/Authentication.md` |
| Authorization | Resource-level checks in handlers | `GetResourceHandler.cs`, AGENTS.md security |
| Bulk ingress | `$import` NDJSON | `docs/BulkImport.md` |
| Bulk egress | `$export` | `docs/BulkExport.md` |
| Schema | Hand-authored SQL migrations | `docs/SchemaMigrationGuide.md` |
| Decisions | ADR index | `docs/arch/Readme.md` |

No `.cursorignore` / agent-boundary rows — that story is interview-presentation.

## 6. Where to Go for Deep Dives

`H2` + `Table` or card grid — curated index from [doc-index.json](doc-index.json):

| Topic | Path | Note |
|-------|------|------|
| Project conventions | `AGENTS.md` | Layers, testing, ADR location |
| Search & persistence | `docs/SearchArchitecture.md` | Extraction → persistence → query |
| Auth & security | `docs/Authentication.md` | Runtime identity |
| Request flows | `docs/flow diagrams/*.md` | Mermaid diagrams |
| ADRs | `docs/arch/Readme.md` | Decision records |
| SQL schema | `docs/SchemaMigrationGuide.md` | Migrations |
| Clinic workflow (product) | `.cursor/skills/product-owner-overview/clinic-workflow.md` | MidSizedClinic clinical steps — not architecture |
| Gaps | `docs/RunningTheProject.md` | Stale — net6.0 reference |

Each row: `Button` openFile. Close with Callout: no `docs/architecture.md` exists —
this Canvas + AGENTS.md + flow diagrams are the map.

## Design constraints

- Reference, don't recreate — max 2 sentences per doc in Canvas body
- `useCanvasAction` openFile for every deep dive
- Colors from `useHostTheme()` only
- Flag sparse/stale docs explicitly (valuable signal)
- One Canvas, ~20-minute review fit
- Architecture only — no kit inventory or homework narrative
