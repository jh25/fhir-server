# Canvas layout spec — architecture overview

**Output:** `~/.cursor/projects/<workspace>/canvases/midsizedclinic-architecture.canvas.tsx`

**Imports:** only `cursor/canvas`. Embed verified facts — no `fetch()`.

## Title

`H1`: MidSizedClinic — Fast Healthcare Interoperability Resources (FHIR) Server Architecture

Subtitle: *What FHIR is, why versions matter, resource types, APIs, Medino, persistence, and how SQL stores FHIR.*

Verified callout: stack · doc counts · no architecture.md

## 1. System context

Clinic one-liner + compact stack table (runtime, hosts, Medino, IFhirDataStore, local URL).

## 2. What is Fast Healthcare Interoperability Resources (FHIR)

Three equal cards (or three short paragraphs). Must not be a single vague sentence.

| Card | Content |
|------|---------|
| What it is exactly | HL7 standard: typed resources (JSON/XML) + REST API. Shared data language + wire protocol. This Microsoft server implements it — FHIR ≠ the product alone. |
| Why it is needed | Avoid private schemas / one-off interfaces between EHR, PACS, imaging apps; consistent patient identity; enforceable access + audit across partners. |
| How it helps MidSizedClinic | One clinical backbone from KnownResourceTypes (Patient, Observation, DiagnosticReport, DocumentReference…). FHIR holds identity, findings, links, authorization. R4 + roles + SQL residency. |

Keep ~180 words total across the three beats.

## 3. FHIR versions — why they exist and how they differ

**Lead prose (required):** versions are published HL7 snapshots; clients/servers must match; not generally compatible; migration may need transforms (`$convert-data` STU3→R4).

**Comparison table (required columns):**

| Version | Era / maturity | How it differs | Clinic relevance | In this repo |
|---------|----------------|----------------|------------------|--------------|
| STU3 | 2017 · trial use | Earlier shapes; many breaks vs R4 | Legacy / conversion | `*.Stu3.Web` |
| R4 | 2019 · normative core | Industry / regulatory baseline | **Primary** | `*.R4.Web` |
| R4B | 2022 · R4 bridge | Small post-R4 backports (e.g. subscription topics) | Only if IG requires | `*.R4B.Web` |
| R5 | 2023 · newer / thinner adoption | New APIs & resource changes; not drop-in from R4 | Optional future | `*.R5.Web` |

Then: Shared.* vs version projects; different version = different host/package, not a config flag; local Docker → R4.

Optional callout: what “definition” means (resource types, elements, search params for that version).

## 4. Resource types (own section)

Must not be only pills inside API surface.

Include:

1. **What** — named HL7 entity shapes; path segment `/{type}`
2. **How the server treats them** — generic routing; CapabilityStatement is runtime truth
3. **KnownResourceTypes.cs** — code constants, incomplete list
4. **Clinic-relevant table** — type · what it’s for · example use at MidSizedClinic

Suggested rows (must exist in `KnownResourceTypes.cs`): Patient, Observation, DiagnosticReport, DocumentReference, Practitioner, Organization, Encounter, Bundle, Binary, AuditEvent.

Open: `KnownResourceTypes.cs`. Do **not** list types absent from that file (e.g. ImagingStudy, ServiceRequest).

## 5. API surface

Operations only (CRUD/search/history/compartment + system/bulk/ops tables). Link KnownRoutes + FhirController. Point to `/metadata`.

## 6. Medino

Dedicated block (not a one-liner):

- Request / Response / Handler pattern
- Flow: Controller → IMediator → HandleAsync
- Why thin controllers
- Medino vs MediatR naming mismatch in AGENTS.md
- Example: Read + GetResourceHandler
- Open buttons to controller, handler, FhirMediatorExtensions

Optional mini DAG: Controller → Mediator → Handler

## 7. IFhirDataStore

Dedicated block:

- What it is (persistence port)
- Methods: Get / Upsert / Merge / HardDelete / search-index helpers
- SQL vs Cosmos implementations
- What it is **not** (not the HTTP API; not the full search planner)
- Open IFhirDataStore.cs + SqlServerFhirDataStore.cs

## 8. Layers + request lifecycle

Short layer table + DAG. Three lifecycle cards (GET / POST / Search) linking flow diagrams.

## 9. SQL ERD

Unchanged requirement: Resource blob + SearchParam + typed index tables + versioning/soft-delete/partition callouts.

## 10. Cross-cutting

AuthN/AuthZ, bulk, schema, ADRs.

## 11. Deep dives

doc-index + gaps callout.

## Design

Plain English. Mix open sections and cards. No kit inventory. Theme tokens only.
