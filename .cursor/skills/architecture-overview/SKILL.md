---
name: architecture-overview
description: >-
  Generates a live Canvas showing MidSizedClinic FHIR Server architecture for
  Solutions Architects and tech leads: tech stack, layered design (main →
  guardrails → house way), request lifecycle, data flow, PHI boundaries, and
  where the Cursor kit plugs into the workflow. Auto-discovers .cursor kit files
  and links to real docs (AGENTS.md, docs/*.md, flow diagrams, code entry
  points) instead of duplicating them. Use when the user runs
  /architecture-overview, says "show me the architecture", or asks how this
  system works, how requests flow, where data persists, or how PHI boundaries
  are enforced.
disable-model-invocation: false
---

# Architecture Overview

Generate a live, auto-updating Canvas for a ~20-minute architecture review.
Visual + reference: show layers and request flow in the Canvas, then link to
real docs for depth — never paste doc bodies here.

**Audience:** Solutions Architect or tech lead joining MidSizedClinic

They need the layered architecture (main → guardrails → house way), tech stack
(.NET FHIR Server, Medino handlers, SQL/Cosmos via `IFhirDataStore`), request
lifecycle, PHI boundaries, and where the kit fits in the developer workflow.

## Narrative Arc (fixed — do not add sections)

1. Tech Stack & Core Patterns (.NET FHIR Server, Medino mediators, `IFhirDataStore`)
2. Layered Architecture (upstream compatibility → PHI safety → house conventions)
3. Request Lifecycle (GET/POST: routing → mediator → handler → persistence → response)
4. Data Flow & Integration (where patient data lives, how it moves, compliance boundary)
5. The Kit's Role (rules, skills, ignore policies in the workflow)
6. Where to Go for Deep Dives (AGENTS.md, docs/*.md, codebase entry points, gaps)

Section 6 is required — it is the "link out" index, not a sixth story beat.
One Canvas per invocation.

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
- [ ] 1. Discover kit files
- [ ] 2. Count docs (docs/*.md, flow diagrams, ADRs)
- [ ] 3. Verify tech stack claims against repo (Medino, IFhirDataStore, backends)
- [ ] 4. Map kit + architecture into arc buckets
- [ ] 5. Write/overwrite Canvas with doc links
- [ ] 6. Narrate X/Y/Z + flag stale/missing docs
```

### 1. Discover kit files

| Class | Globs |
|-------|-------|
| Boundary | `.cursorignore`, `.cursorindexingignore` |
| Rules | `.cursor/rules/**/*.mdc` |
| Skills | `.cursor/skills/**/SKILL.md` |

Include this skill. Skip scripts/yaml except `doc-index.json`.

### 2. Extract metadata

Same shapes as [interview-presentation](../interview-presentation/SKILL.md) step 2.

### 3. Verified architecture facts (check before writing)

These were confirmed against this repo — update if upstream changes:

| Claim | Verified where |
|-------|----------------|
| .NET SDK 10.0.302, `net10.0` | `global.json`, `Directory.Build.props` |
| FHIR R4/R5/STU3 version projects | `AGENTS.md` project table |
| Medino `IMediator` + handlers | `FhirController.cs`, `GetResourceHandler.cs` (`using Medino`) |
| AGENTS.md says MediatR | Stale label — code namespace is **Medino**, same Request/Handler pattern |
| `IFhirDataStore` abstraction | `src/.../Persistence/IFhirDataStore.cs` |
| SQL + Cosmos implementations | `SqlServerFhirDataStore.cs`, `CosmosFhirDataStore.cs` |
| GET/POST flows | `docs/flow diagrams/read-resource.md`, `create-resource.md` |
| No `docs/architecture.md` | Absent — narrate the gap |
| `RunningTheProject.md` stale | Still mentions net6.0 |

### 4. Map into the arc

| Section | Source |
|---------|--------|
| Tech stack | Verified facts + `doc-index.json` links |
| Layers | upstream OSS + boundary files + skills/rules inventory |
| Request lifecycle | Flow diagram steps (summarized) + controller/handler links |
| Data flow | SearchArchitecture, BulkImport/Export, auth + `.cursorignore` |
| Kit role | Live skill/rule/boundary counts with workflow moments |
| Deep dives | Full `doc-index.json` table + stale/missing doc callouts |

### 5. Write the Canvas

- Path: `~/.cursor/projects/<workspace>/canvases/midsizedclinic-architecture.canvas.tsx`
- Layout: [layout-spec.md](layout-spec.md)
- Every deep dive gets `useCanvasAction` → `openFile`

### 6. Narrate in chat (required)

> Found X kit files, Y had metadata, Z inferred · N docs under docs/*.md

One sentence on the biggest doc gap (no architecture.md, or stale RunningTheProject).
Link the Canvas with absolute path markdown.

## Key Constraints

- **DO NOT recreate docs** — link them
- Cover: tech stack, layers, request flow, persistence, integration, PHI boundaries, kit workflow
- **One Canvas**, ~20-minute review
- Flag sparse/stale docs — that is valuable signal

## Known Limits

If docs are sparse or outdated, say so in the Canvas stale-docs callout. Refresh
`doc-index.json` when new first-class architecture docs land.

## Anti-patterns

- Pasting SearchArchitecture or ADR text into the Canvas
- Inventing a persistence story not in repo docs/code
- Hiding the Medino vs MediatR naming mismatch
- Skipping the deep-dives section
