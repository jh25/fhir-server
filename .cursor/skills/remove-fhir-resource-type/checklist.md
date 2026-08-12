# Remove FHIR resource type — step card

Companion to [SKILL.md](SKILL.md). Pairs with [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md).

## Prompts

1. Which type?
2. Version? (R4 default)
3. Added via add-fhir-resource-type on this branch?
4. Goal: undo wiring · hide from `/metadata` · git rollback
5. Preserve `dbo.Resource`? **Must be yes**

## ImagingStudy R4 — undo wiring only (go straight here)

| Action | Path |
|--------|------|
| `git status` / `git diff` first | Uncommitted → delete + restore; committed → revert or hand-delete |
| Remove const | `KnownResourceTypes.cs` |
| Delete validator | `…/Validation/ImagingStudyRequiredFieldsValidator.cs` |
| Unwire | `ResourceElementValidator.cs` — drop `SetValidator(new ImagingStudyRequiredFieldsValidator())` |
| Delete unit + projitems line | `ImagingStudyRequiredFieldsValidatorTests.cs` + Shared.Core.UnitTests.projitems |
| Delete E2E + projitems line | `Rest/ImagingStudyTests.cs` + Shared.Tests.E2E.projitems |
| Delete clinic JSON + csproj | `imagingstudy-clinic-required.json` + Tests.Common.csproj embed |

**Do not touch:** `imagingstudy-example.json`, HL7 search/compartment JSON, SqlServerSortingValidator, FHIRDataSynth, `dbo.Resource`.

## Verify

```bash
rg -n "ImagingStudyRequiredFieldsValidator|imagingstudy-clinic-required|ImagingStudyTests|KnownResourceTypes\.ImagingStudy" src test || true
dotnet build src/Microsoft.Health.Fhir.R4.Core/Microsoft.Health.Fhir.R4.Core.csproj
```

`/metadata` still lists ImagingStudy (Firely) — OK for wiring-only undo.

## Generic steps (other types / other goals)

| # | Action | Notes |
|---|--------|-------|
| 1 | Remove `KnownResourceTypes` const | Not the API allowlist |
| 2 | Revert **our** search/conformance edits | Do not gut HL7 JSON |
| 3 | Remove custom validators; optional ModelInfo filter | Filter = experiment only |
| 4 | Remove tests we added | Keep shared fixtures others use |
| 5 | Check `GET /metadata` | Const-only remove ⇒ type may remain |
| 6 | SQL: rows still in `dbo.Resource` | No hard-delete |

## Rules

FHIR-00 · FHIR-02 · git for full rollback · never delete clinical rows for unregister
