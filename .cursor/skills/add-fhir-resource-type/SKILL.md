---
name: add-fhir-resource-type
description: >-
  Guides engineers through integrating a FHIR resource type into the Microsoft
  FHIR Server across three levels: FHIR spec (Firely), codebase integration
  (KnownResourceTypes, conformance, validators, tests), and clinic capability
  (REST instead of direct SQL). Interactive: identify resource, verify spec,
  diagnose gaps, choose goal, execute. Prefers ImagingStudy. Use when the user
  runs /add-fhir-resource-type, says "wire ImagingStudy", "integrate a resource
  type", or asks how to extend server capabilities for a resource.
disable-model-invocation: false
---

# Add FHIR Resource Type

Guide engineers through **integrating a FHIR resource type** into the Microsoft
FHIR Server. Audience: engineer extending server capabilities. Outcome: the
resource is **usable via FHIR REST API** with honest gaps closed at the right
level — not a slide, not “add a const and hope.”

Pairs with [remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md)
(unregister wiring without deleting `dbo.Resource` data).

Follow **FHIR-00**, **FHIR-02**. Deep patterns:
[architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md).
ImagingStudy clinic contracts: **FHIR-10**–**FHIR-13**. Spec metadata:
`Hl7.Fhir.Model.ModelInfo`, `Hl7.Fhir.Specification.*`, Specification.Data.

## Three levels (diagnose before coding)

| Level | Meaning | How to verify |
|-------|---------|----------------|
| **1. FHIR spec** | Resource is defined in the HL7 standard for this version | Firely `ModelInfo.IsKnownResource` / `SupportedResources`; StructureDefinition in Specification.Data; HL7 docs |
| **2. Codebase integration** | Type is wired for maintainable product use | `KnownResourceTypes` const; search-params / converters OK; `/metadata`; validators (generic + clinic); unit + E2E (FHIR-02) |
| **3. Clinic capability** | Clinic can use the resource via **FHIR REST** instead of direct SQL | Create/read/search/compartment over HTTP; apps (e.g. worklist) call REST; FHIR-10 rules enforced where required |

**Important distinctions**

- Level 1 **does not** imply level 2. Spec-defined types can still lack consts, clinic validators, and tests.
- Level 1 + generic hosting often already allows basic REST; level 2/3 close **integration and clinic** gaps (constants, FHIR-10, tests, stop SQL bypasses).
- `KnownResourceTypes` is **codebase integration** (constants / special cases) — **not** the Firely allowlist. Do not teach “add const to enable CRUD.”

### Recommended starter: ImagingStudy

| Level | ImagingStudy (R4) |
|-------|-------------------|
| **1 Spec** | **Exists** — Firely; `Data/R4/search-parameters.json`; `compartment.json`; `TestFiles/R4/imagingstudy-example.json` (HL7 sample — incomplete for FHIR-10) |
| **2 Codebase** | **Re-verify every run** (add↔remove cycles leave these absent). If missing → create (table below). If present → skip to Level 3 / remaining gaps. |
| **3 Clinic** | Demo worklist may still use SQL (`midsizedclinic-demo-app`) — Level 3 is “apps call FHIR REST”, not more server wiring |

Default suggestion unless the engineer names another type: **ImagingStudy**.

## Agent fast path (do not rediscover)

Go **straight to these files**. Avoid broad `**/Validator*` / architecture tours.
After [remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md), paths below are usually **gone** — **create** them; do not assume a prior add left them on disk.

| Goal | Path / action |
|------|----------------|
| Const | `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs` (alpha insert) |
| Spec search params | `rg '"ImagingStudy"' src/Microsoft.Health.Fhir.Core/Data/R4/search-parameters.json` — already present; **do not** edit HL7 JSON for ImagingStudy |
| Compartment | `Data/R4/compartment.json` — already lists ImagingStudy |
| Conformance | No code change — `GET /metadata` from `GetResourceTypeNames()` / Firely |
| Clinic required fields | Add/extend `AbstractValidator<ResourceElement>` like `NarrativeValidator`; **compose** in `ResourceElementValidator` with `RuleFor(x => x).SetValidator(new …())` |
| FHIR-10 validator | **Create if missing:** `src/Microsoft.Health.Fhir.Core/Features/Validation/ImagingStudyRequiredFieldsValidator.cs` |
| Wire point | `ResourceElementValidator.cs` — `RuleFor(x => x).SetValidator(new ImagingStudyRequiredFieldsValidator())`; Create/Upsert already nest this; **no** new DI / no handler-only checks |
| Issue shape | `FhirValidationFailure` + `OperationOutcomeIssue` + `OperationOutcomeConstants.IssueType.Required` |
| Unit tests | **Create if missing:** `…/ImagingStudyRequiredFieldsValidatorTests.cs` + projitems Compile |
| Unit projitems | **Must** add `<Compile Include=…>` to `Microsoft.Health.Fhir.Shared.Core.UnitTests.projitems` |
| E2E tests | **Create if missing:** `test/…/Rest/ImagingStudyTests.cs` + `Shared.Tests.E2E.projitems` Compile |
| E2E usings | `Microsoft.Health.Fhir.Core.Extensions` for `.ToPoco<T>()` |
| Clinic sample JSON | **Create if missing:** `TestFiles/R4/imagingstudy-clinic-required.json` (+ EmbeddedResource in `Tests.Common.csproj`). **Do not** use `imagingstudy-example.json` for FHIR-10 happy path |
| Verify unit | `dotnet test src/Microsoft.Health.Fhir.R4.Core.UnitTests/… --filter FullyQualifiedName~ImagingStudyRequiredFieldsValidatorTests` |
| Verify E2E compile | `dotnet build test/Microsoft.Health.Fhir.R4.Tests.E2E/…` (full E2E needs host/DB) |

**Pitfalls (costly if rediscovered)**

1. **`ITypedElement.Scalar("started") as string` is wrong** — dateTime often returns `DateTimeOffset`; use `value?.ToString()` / non-empty check.
2. **FHIR-10 study-level `modality` is R4+** — skip clinic rules when `ModelInfoProvider.Version == FhirSpecification.Stu3`; wrap POCO ImagingStudy modality tests in `#if !Stu3`.
3. **Nested validators use `new`, not DI** — `ValidationModule` registers request `IValidator<>`; `ResourceElementValidator` children are constructed inline (same as Narrative).
4. **Shared projects need projitems** — new `.cs` under `Shared.*.UnitTests` / `Shared.Tests.E2E` is invisible until listed.
5. **A+B+C does not require converter or CapabilityStatement edits** for ImagingStudy — search/metadata already work via Firely.

## Interactive workflow (required — ask before coding)

Simple questions. Answer one at a time:

```
1. Which resource type? (or press enter for ImagingStudy)
   → ImagingStudy

2. FHIR version? (or press enter for R4)
   → R4

3. Verify spec exists? (rg Data/R4 — ImagingStudy already in search-params + compartment)

4. Re-verify codebase gaps (check fast-path files — may be absent after remove):
   A: KnownResourceTypes.ImagingStudy
   B: ImagingStudyRequiredFieldsValidator (+ ResourceElementValidator wire)
   C: unit + E2E ImagingStudy tests in projitems
   
5. Which gaps to fix this pass?
   Only missing ones · A+B+C if greenfield / post-remove · Level 3 app REST if server already done
```

### Spec gather (after type + version chosen)

1. Required / mustSupport elements — Firely POCO + StructureDefinition.
2. Search parameters — `src/Microsoft.Health.Fhir.Core/Data/{version}/search-parameters.json`
   (+ `ms-search-parameters.json` / `unsupported-search-parameters.json`).
3. Compartments — `compartment.json`.
4. ImagingStudy clinic create — also FHIR-10: status, modality, started, description, subject → Patient.

## Execute checklist (level 2 → prove level 3)

```
Integrate resource type:
- [ ] 0. Three-level diagnosis + goal locked
- [ ] 1. KnownResourceTypes const
- [ ] 2. Search param extraction (verify / fix)
- [ ] 3. Conformance / CapabilityStatement (verify /metadata)
- [ ] 4. Validators (generic; + FHIR-10 if in goal)
- [ ] 5. Unit + E2E tests (FHIR-02)
- [ ] 6. Verify REST API (clinic capability proof)
```

### 1. KnownResourceTypes const

File: `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs`

- Add `public const string {Type} = "{Type}";`.
- Use it in new special-case / clinic code instead of string literals.
- Does **not** register the type with Firely — level 2 documentation + typed references.

### 2. Search param extraction

- Confirm embedded search params for the type (ImagingStudy: already in R4 data).
- Generic path: `TypedElementSearchIndexer` + `Features/Search/Converters/`.
- Add/adjust a converter **only** for unsupported FHIR *element datatypes*.
- ImagingStudy: verify compartment search `GET /Patient/{id}/ImagingStudy` (FHIR-10).

### 3. Conformance / CapabilityStatement

- Built from `IModelInfoProvider.GetResourceTypeNames()` — not KnownResourceTypes.
- Verify `GET /metadata` lists type + interactions + search params.
- Touch CapabilityStatement / `KnownRoutes` only for true special cases.

### 4. Validators

- Default: FluentValidation → `ResourceContentValidator` / Firely attributes; optional profiles via Specification.Data.
- Do **not** invent a parallel validator stack or handler-only clinic checks.
- FHIR-10 ImagingStudy: `ImagingStudyRequiredFieldsValidator` composed into `ResourceElementValidator` (covers create + upsert). **Create if missing** (common after remove); reuse/extend only if present and rules changed.
- Authz stays in handlers (FHIR-00); validation stays in FluentValidation → `OperationOutcome`.

### 5. Unit + E2E tests (FHIR-02)

| Layer | Prove | Pattern |
|-------|-------|---------|
| Unit | FHIR-10 reject/accept; no-op for other types | xUnit AAA on validator directly (see `ImagingStudyRequiredFieldsValidatorTests`) |
| E2E | HTTP create 201; incomplete → 400; compartment scoped | `TestFhirClient` + `HttpIntegrationTestFixture` (`ImagingStudyTests`) |

- Naming: `Given{Precondition}_When{Action}_Then{Result}`.
- Build POCO in test or use `imagingstudy-clinic-required.json` — not the stock HL7 example for happy path.
- Register new test files in **projitems** + EmbeddedResource in `Tests.Common.csproj` when adding JSON.
- Build before writing tests (`AGENTS.md`). Prefer unit filter above before full E2E.

### 6. Verify REST API (level 3 proof)

Local R4 host (**local-setup** if needed):

```http
GET  /metadata
POST /ImagingStudy
GET  /ImagingStudy/{id}
GET  /Patient/{patientId}/ImagingStudy?_sort=-started
```

Expect: listed in CapabilityStatement; 201 + Location/ETag on create; compartment
scoped to that patient. No raw SQL in Core/Api; no PHI in logs. Clinic apps should
call these APIs — not `dbo.Resource` directly.

## References

| Doc / rule | Use |
|------------|-----|
| [.cursor/rules/FHIR-00-architecture-patterns.mdc](../../rules/FHIR-00-architecture-patterns.mdc) | Medino, IFhirDataStore, authz-first |
| [.cursor/rules/FHIR-02-testing-patterns.mdc](../../rules/FHIR-02-testing-patterns.mdc) | xUnit, NSubstitute, AAA |
| FHIR-10–13 MidSizedClinic imaging rules | Clinic REST contracts |
| [architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md) | Architecture depth |
| `Hl7.Fhir.Model.ModelInfo` + Specification.Data | Spec / validation source |
| [checklist.md](checklist.md) | Three-level step card |
| [remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md) | Reverse wiring; keep DB rows |

## Anti-patterns

- Treating missing `KnownResourceTypes` as “not in the FHIR spec”
- Teaching const-add as the way to “enable” CRUD
- New per-type controller when generic CRUD already works
- Direct SQL for clinic features that should be FHIR REST (fails level 3)
- Raw SQL / store bypass in handlers (FHIR-00)
- Moq / NUnit / MSTest; PHI in logs; skipping E2E for HTTP-visible work

## Done when

- [ ] Three-level diagnosis recorded (spec / codebase / clinic)
- [ ] Chosen goal completed (minimal const+tests and/or FHIR-10)
- [ ] `/metadata` + REST create/read/compartment verified
- [ ] Unit + E2E green (FHIR-02); FHIR-00 / FHIR-01 respected
- [ ] Clinic path uses REST (no new SQL shortcuts for this resource)
