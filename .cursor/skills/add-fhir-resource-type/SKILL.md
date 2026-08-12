---
name: add-fhir-resource-type
description: >-
  Guides engineers through adding or properly wiring a FHIR resource type on the
  Microsoft FHIR Server with interactive prompts: choose the type, gather HL7
  search params and required fields, then walk KnownResourceTypes, search
  extraction, conformance, validators, unit+E2E tests (FHIR-02), and REST
  verification. Prefers ImagingStudy for MidSizedClinic. Use when the user runs
  /add-fhir-resource-type, says "add a FHIR resource type", "wire ImagingStudy",
  or asks how to extend supported resources.
disable-model-invocation: false
---

# Add FHIR Resource Type

Interactive guide for an **engineer extending the Microsoft FHIR Server**. Outcome:
a real, testable contribution — not a slide.

Follow **FHIR-00** (Medino / `IFhirDataStore` / authz-first), **FHIR-02** (xUnit +
NSubstitute + AAA). Deep patterns:
[architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md).
Imaging clinic contracts (when type is ImagingStudy): **FHIR-10**–**FHIR-13**.

Resource metadata / required elements: HL7 Firely packages
(`Hl7.Fhir.Model.ModelInfo`, `Hl7.Fhir.Specification.*`, structure defs via
Specification.Data) — do not invent fields.

## Critical discovery (ask early)

**MidSizedClinic priority:** recommend **ImagingStudy** first unless the engineer
has another explicit type.

Tell them plainly:

- ImagingStudy is in **Firely `ModelInfo`**, R4 `search-parameters.json`,
  `compartment.json`, SQL `ResourceType` seeding, and
  `src/Microsoft.Health.Fhir.Tests.Common/TestFiles/R4/imagingstudy-example.json`.
- It is **absent from** `KnownResourceTypes.cs` — that file is **not** the API
  allowlist; engineers often mistake “missing const” for “not wired.”
- Typical first contribution for ImagingStudy: add the `KnownResourceTypes`
  constant, verify create/search/compartment REST, add **FHIR-10** required-field
  validation if missing, and ship **unit + E2E** coverage for clinic flows.

Do **not** teach “add to KnownResourceTypes to enable CRUD.” Firely
`ModelInfo.IsKnownResource` / `GetResourceTypeNames()` drives routing and
CapabilityStatement. `KnownResourceTypes` is for compile-time constants and
special-case logic.

## Interactive prompts (required — ask before coding)

Copy and fill:

```
Resource type work:
- [ ] 1. Which resource type? (default suggestion: ImagingStudy)
- [ ] 2. FHIR version target? (MidSizedClinic / Docker default: R4)
- [ ] 3. Already in ModelInfo / GET /metadata? (yes / no / unknown — verify)
- [ ] 4. Goal: KnownResourceTypes const + tests | custom search | clinic validation (FHIR-10) | other
- [ ] 5. Spec checklist: required elements + search params gathered from HL7
```

Ask conversationally if answers are missing. Prefer one question at a time when
the engineer is unsure.

### Gather from the FHIR spec (before edits)

For the chosen type + version:

1. **Required / mustSupport elements** — Firely POCO + StructureDefinition
   (Specification.Data / HL7 docs). For ImagingStudy clinic create, also apply
   FHIR-10 (status, modality, started, description, subject → Patient).
2. **Standard search parameters** — confirm entries in
   `src/Microsoft.Health.Fhir.Core/Data/{R4|...}/search-parameters.json`
   (and `ms-search-parameters.json` / `unsupported-search-parameters.json`).
3. **Compartment membership** — `compartment.json` (Patient compartment includes
   ImagingStudy by `subject`).

## Workflow checklist

```
Add / wire resource type:
- [ ] 0. Discovery + spec gather (prompts above)
- [ ] 1. KnownResourceTypes const
- [ ] 2. Search param extraction
- [ ] 3. Conformance / CapabilityStatement
- [ ] 4. Validators
- [ ] 5. Unit + E2E tests (FHIR-02)
- [ ] 6. Verify REST API
```

### 1. Add const to KnownResourceTypes

File: `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs`

- Add `public const string {Type} = "{Type}";` (alphabetical / local style).
- Use the constant in new special-case code instead of string literals.
- Reminder: this does **not** register the type with Firely; it documents intent
  and enables typed references in Core/Api.

### 2. Wire / verify search param extraction

- Confirm base search params exist in embedded `search-parameters.json` for the type.
- Extraction path is generic: `TypedElementSearchIndexer` + converters under
  `src/Microsoft.Health.Fhir.Core/Features/Search/Converters/`.
- **Only** add/adjust a converter if a FHIR *element datatype* is unsupported —
  not one converter per resource type.
- If a param is wrongly unsupported, check `unsupported-search-parameters.json`
  and support tests (e.g. search converter coverage tests).
- ImagingStudy: params already present in R4 data; verify compartment search
  `GET /Patient/{id}/ImagingStudy` (FHIR-10).

### 3. Update / verify conformance provider

- CapabilityStatement resources come from
  `IModelInfoProvider.GetResourceTypeNames()` via
  `CapabilityStatementBuilder.PopulateDefaultResourceInteractions` — **not**
  from KnownResourceTypes.
- After host is up: `GET /metadata` and confirm the type + interactions + search
  params.
- Touch CapabilityStatement / `KnownRoutes` **only** for true special cases
  (e.g. AuditEvent no update/delete, type-specific operations).

### 4. Validators

- Default path is generic: create/upsert FluentValidation →
  `ResourceContentValidator` / Firely attribute validation; optional profile
  validation via Specification.Data.
- **Do not** invent a parallel validator stack.
- MidSizedClinic ImagingStudy: enforce FHIR-10 required fields (reject with
  `OperationOutcome` `required`) in the **handler/validator pipeline**, still
  authz-first and `IFhirDataStore` only (FHIR-00).

### 5. Unit + E2E tests (FHIR-02)

| Layer | What to prove | Pattern |
|-------|---------------|---------|
| Unit | Authz first; store called; required-field rejection | xUnit + NSubstitute; mock `IFhirDataStore` / `IAuthorizationService`; AAA |
| E2E | HTTP create / read / search / compartment | `TestFhirClient` + `HttpIntegrationTestFixture`; samples under `Microsoft.Health.Fhir.Tests.Common` |

- Naming: `Given{Precondition}_When{Action}_Then{Result}` (or equivalent scenario name).
- Reuse `imagingstudy-example.json` or add a clinic-shaped sample that includes
  FHIR-10 fields — **tests only**, never production fixture reads (FHIR-01).
- Build succeeds before adding tests (`AGENTS.md`).

### 6. Verify REST API works

Against local R4 host (use **local-setup** if needed):

```http
GET  /metadata
POST /ImagingStudy
GET  /ImagingStudy/{id}
GET  /Patient/{patientId}/ImagingStudy?_sort=-started
```

Expect: type listed in CapabilityStatement; create returns 201 + Location/ETag;
compartment returns only that patient’s studies. No raw SQL; no PHI in logs.

## References (one level)

| Doc / rule | Use |
|------------|-----|
| [.cursor/rules/FHIR-00-architecture-patterns.mdc](../../rules/FHIR-00-architecture-patterns.mdc) | Medino, IFhirDataStore, authz-first |
| [.cursor/rules/FHIR-02-testing-patterns.mdc](../../rules/FHIR-02-testing-patterns.mdc) | xUnit, NSubstitute, AAA |
| [architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md) | Deep architecture |
| FHIR-10–13 MidSizedClinic imaging rules | ImagingStudy/DiagnosticReport clinic contracts |
| `Hl7.Fhir.Model.ModelInfo` + Specification.Data | Spec metadata / validation source |
| [checklist.md](checklist.md) | Printable step card |

## Anti-patterns

- Claiming a type is “unsupported” only because it is missing from KnownResourceTypes
- New controller/handler per resource type when generic CRUD already works
- Raw SQL or bypassing `IFhirDataStore`
- Business logic in controllers; authz after persistence
- Moq / NUnit / MSTest
- Logging PHI from sample ImagingStudy bodies
- Skipping E2E when the change is HTTP-visible

## Done when

- [ ] Spec required fields + search params documented in the PR/description
- [ ] KnownResourceTypes const added (if that was in scope)
- [ ] Search/compartment verified; converters only if needed
- [ ] `/metadata` shows the type
- [ ] Unit + E2E green (FHIR-02)
- [ ] Manual REST check passed
- [ ] FHIR-00 / FHIR-01 respected; ImagingStudy also FHIR-10 if applicable
