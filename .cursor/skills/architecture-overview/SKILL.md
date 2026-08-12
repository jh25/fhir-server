---
name: architecture-overview
description: >-
  Generates a live Canvas of Microsoft Fast Healthcare Interoperability Resources
  (FHIR) Server architecture for MidSizedClinic Solutions Architects and tech
  leads: FHIR versions (STU3/R4/R4B/R5), resource types explained, API operations
  inventory, Medino mediation, IFhirDataStore, layered design, request lifecycle,
  and SQL ERD. Links real docs and schema. Use when the user runs
  /architecture-overview, asks what APIs or resource types exist, how Medino or
  IFhirDataStore works, how SQL stores FHIR JSON, or how requests flow.
disable-model-invocation: false
---

# Architecture Overview

Generate a live, auto-updating Canvas for a ~25-minute Fast Healthcare
Interoperability Resources (FHIR) Server architecture review. Teach **what exists
to use** (versions, resource types, APIs) and **how the core abstractions work**
(Medino, IFhirDataStore), then link docs for depth.

On first mention in the Canvas (title or section 1), write **Fast Healthcare
Interoperability Resources (FHIR)** before using the acronym alone.

**Audience:** Solutions Architect or tech lead joining MidSizedClinic

Kit / Cursor storytelling → [interview-presentation](../interview-presentation/SKILL.md).
Clinic workflow product view → [product-owner-overview](../product-owner-overview/SKILL.md).

## Narrative Arc (fixed)

1. **System Context** — MidSizedClinic + stack snapshot
2. **What is FHIR** — exact definition, why it is needed, how it helps MidSizedClinic
3. **FHIR versions** — why versions exist; how STU3 / R4 / R4B / R5 differ; how this repo ships them
4. **Resource types** — what a resource type is, clinic-relevant types, CapabilityStatement
5. **API Surface** — operations on `{type}` + system/bulk/custom ops (KnownRoutes)
6. **Medino** — Request → Handler mediation (why controllers stay thin)
7. **IFhirDataStore** — persistence contract and what it does / does not do
8. **Layered Design + Request Lifecycle** — Api → Core → Persistence; GET/POST/search
9. **SQL Data Model (ERD)** — Resource blob + search-param tables + versioning
10. **Cross-Cutting Concerns** — authz, bulk, schema, ADRs
11. **Deep Dives** — curated links + stale/missing docs

One Canvas per invocation. Section 11 is the link-out index.

**Clinic note (section 1):** One short sentence on MidSizedClinic as clinical data
platform. Do not expand kit layers here. FHIR meaning lives in section 2.

## Design Principle

- **Explain** FHIR itself, version differences, Medino, resource types, and
  IFhirDataStore in plain English with real paths — not one-line table cells only.
- Sections 2–3 must be readable by a tech lead who has never implemented HL7.
- API inventory + SQL ERD remain first-class.
- Long docs: max two sentences + `openFile`.

Layout: [layout-spec.md](layout-spec.md). Paths: [doc-index.json](doc-index.json).

## Workflow (every invocation — live)

```
Architecture overview:
- [ ] 1. Count docs / flows / ADRs
- [ ] 2. Confirm KnownRoutes, Resource.sql, IFhirDataStore, version Web projects
- [ ] 3. Write/overwrite Canvas (FHIR primer + version diffs + resource types + Medino + IFhirDataStore + API + ERD)
- [ ] 4. Narrate + link Canvas
```

### Sources to cite

| Topic | Source |
|-------|--------|
| Routes | `KnownRoutes.cs`, controllers |
| Resource type constants (partial) | `KnownResourceTypes.cs` — not exhaustive |
| Runtime types | `GET /metadata` CapabilityStatement |
| Versions | `Microsoft.Health.Fhir.{Stu3\|R4\|R4B\|R5}.Web`, Shared.* projects |
| Medino | Handlers `using Medino`; `IRequestHandler<,>`; `FhirMediatorExtensions` |
| Store | `IFhirDataStore.cs`, SqlServer/Cosmos implementations |
| SQL ERD | `Resource.sql`, `*SearchParam.sql` |

### Required explanations (Canvas must include)

**What is FHIR (section 2 — required, plain English)**

Must cover three beats (cards or short paragraphs). Do not skip any:

1. **What it is exactly** — Fast Healthcare Interoperability Resources (FHIR) is an
   HL7 standard for representing and exchanging clinical data as typed **resources**
   (JSON/XML) over a predictable **REST API** (`GET/POST /Patient/...`, search,
   history, CapabilityStatement). It is a shared data language + wire protocol, not
   a brand of database and not the Microsoft server alone. The Microsoft FHIR Server
   in this repo is one compliant implementation of that standard.
2. **Why it is needed** — Without a shared standard, every EHR, PACS, imaging app,
   and analytics tool invents private schemas and custom interfaces. That creates
   brittle one-off integrations, inconsistent identity for the same patient, and
   expensive rewrites when vendors change. Healthcare also needs auditability and
   minimum-necessary access; a common resource model makes those controls enforceable
   the same way across systems.
3. **How it helps MidSizedClinic** — Clinic systems (check-in, clinical observations,
   reporting, referrer exchange) speak one clinical backbone using types from
   `KnownResourceTypes` (Patient, Observation, DiagnosticReport, DocumentReference,
   etc.). FHIR holds identity, findings, report links, and who may access what.
   R4 REST + roles + SQL residency match clinic interoperability and compliance
   goals without building a private API for every partner.

Keep this section under ~180 words total. No resource-field dumps.

**FHIR versions (section 3 — required)**

Must explain **why versions exist**, then **how each differs**, then **how this repo ships them**.

**Why versions exist**

- HL7 evolves the standard over years: new resource types, changed elements, better
  APIs (e.g. subscriptions), normative (locked) content vs trial-use content.
- A version is a **published snapshot** of the resource definitions, search params,
  and API rules. Clients and servers must agree on the same version — JSON that is
  valid R4 may be invalid or mean something different in STU3 or R5.
- Versions are **not** forward/backward compatible in general. Migrating data often
  needs transforms (this repo’s `$convert-data` can help STU3→R4).

**How the versions differ (use a comparison table + short prose)**

| Version | Era / maturity | How it differs (architect-level) | MidSizedClinic relevance |
|---------|----------------|----------------------------------|--------------------------|
| **STU3** | 2017 · Standard for Trial Use | Earlier resource shapes and search rules; many breaking changes vs R4 (renamed/removed resources, element changes). Still seen in older vendor feeds. | Legacy interop / conversion path; not clinic primary |
| **R4** | 2019 · first widely **normative** core | Stable baseline for most US/regulatory and EHR integrations; broad IG and vendor support. Resource set and REST patterns MidSizedClinic designs against. | **Clinic primary**; local Docker default |
| **R4B** | 2022 · bridge on R4 base | Mostly R4-compatible; backports a small set of post-R4 capabilities (notably topic-based subscription pieces) without full R5 adoption. | Use only if an IG/partner requires R4B |
| **R5** | 2023 · newer trial-use-heavy release | New/changed resources and APIs (e.g. redesigned subscriptions; Media removed in favor of DocumentReference patterns; richer search/`_filter`). **Not** a drop-in upgrade from R4; ecosystem adoption still thinner than R4. | Optional future host; not clinic default |

Also state clearly:

- **Different version ⇒ different HL7 model package** and usually a **different Web host** in this repo — not a runtime toggle on one process.
- Shared logic: `Microsoft.Health.Fhir.Shared.*` + version-agnostic Core; version projects (`*.Stu3.Web`, `*.R4.Web`, `*.R4B.Web`, `*.R5.Web`) bind the correct FHIR .NET models.
- Local Docker / MidSizedClinic default is **R4**.

**Resource types**

- A **resource type** is a named FHIR entity shape (`Patient`, `Observation`, `DiagnosticReport`, …) with defined elements and search parameters in the HL7 spec for that version.
- HTTP paths use `/{resourceType}/...`.
- **Only cite types present in** `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs` in the Canvas table. Do **not** invent clinic favorites (e.g. ImagingStudy, ServiceRequest) that are absent from that file.
- Clinic-relevant examples from KnownResourceTypes: Patient, Observation, DiagnosticReport, DocumentReference, Practitioner, Organization, Encounter, Bundle, Binary, AuditEvent, …
- Engineers should treat **`GET /metadata`** as the runtime inventory of enabled types/ops.

**Medino**

- In-process mediator: controller builds a **Request**, calls `IMediator` (`SendAsync` or typed extensions like `GetResourceAsync` / `CreateResourceAsync`), Medino dispatches to the matching **`IRequestHandler<TRequest, TResponse>.HandleAsync`**.
- AGENTS.md may still say “MediatR”; **code uses Medino** — same pattern, different package.
- Why: thin controllers, testable handlers, one pipeline for authz/validation/telemetry.
- Example path: `FhirController.Read` → `GetResourceRequest` → `GetResourceHandler`.

**IFhirDataStore**

- Abstraction over **persistence only** (not HTTP, not FHIRPath search planning).
- Core methods: `GetAsync`, `UpsertAsync`, `MergeAsync`, `HardDeleteAsync`, search-index update helpers.
- Implementations: `SqlServerFhirDataStore`, `CosmosFhirDataStore` — handlers stay backend-agnostic.
- Does **not** replace search services; on write, handlers/indexer extract search values that SQL stores in `*SearchParam` tables (see ERD section).
- Never bypass with raw SQL from Core/Api.

## Key Constraints

- Do not invent endpoints/tables
- Section 2 must answer what / why / how-helps before any version table
- Section 3 must say why versions exist **and** how STU3/R4/R4B/R5 differ (not only “older/newer”)
- Resource types section must be separate from API operations tables
- Medino + IFhirDataStore each get a real explanation block
- No kit narrative

## Anti-patterns

- Jumping to STU3/R4 cards without explaining what FHIR is
- Version section that only lists repo project names with no semantic differences
- One-line “Medino = mediator” with no flow
- Treating KnownResourceTypes as the complete type list
- Collapsing resource types into API ops only
- Implying IFhirDataStore runs FHIR search queries end-to-end
- Layers-only Canvas without API/ERD/explanations
