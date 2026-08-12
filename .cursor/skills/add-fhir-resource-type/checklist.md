# Add FHIR resource type — three-level step card

Companion to [SKILL.md](SKILL.md). Pairs with [remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md).

## Levels

| # | Level | Question |
|---|-------|----------|
| 1 | FHIR spec | Firely / HL7 define it? |
| 2 | Codebase | Const, search, validators, tests? |
| 3 | Clinic | Apps use FHIR REST (not SQL)? |

## ImagingStudy R4 — go straight here

After remove, these are usually **absent** — **create**; do not assume prior add left them.

| Item | Path |
|------|------|
| Const | `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs` |
| FHIR-10 validator | `…/Validation/ImagingStudyRequiredFieldsValidator.cs` (create if missing) |
| Wire | `…/Validation/ResourceElementValidator.cs` |
| Unit | `Shared.Core.UnitTests/…/ImagingStudyRequiredFieldsValidatorTests.cs` + **projitems** |
| E2E | `Shared.Tests.E2E/Rest/ImagingStudyTests.cs` + **projitems** |
| Clinic JSON | `TestFiles/R4/imagingstudy-clinic-required.json` (not `imagingstudy-example.json`) |

## Pitfalls

- `Scalar("started") as string` → null (use `ToString()`)
- Stu3: skip study-level modality rules; `#if !Stu3` for POCO tests
- Nested validators = `new`, not DI
- Shared test `.cs` must be in projitems

## Quick verify

```bash
dotnet test src/Microsoft.Health.Fhir.R4.Core.UnitTests/Microsoft.Health.Fhir.R4.Core.UnitTests.csproj --filter FullyQualifiedName~ImagingStudyRequiredFieldsValidatorTests
dotnet build test/Microsoft.Health.Fhir.R4.Tests.E2E/Microsoft.Health.Fhir.R4.Tests.E2E.csproj
```

## Rules

FHIR-00 · FHIR-01 · FHIR-02 · FHIR-10+ · architecture-explained.md
