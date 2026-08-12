# Add FHIR resource type — step card

Printable companion to [SKILL.md](SKILL.md).

## Prompts

1. Resource type? → prefer **ImagingStudy** for MidSizedClinic
2. Version? → **R4** default
3. In `ModelInfo` / `GET /metadata` already?
4. Scope: const + tests · search · clinic validation (FHIR-10) · other
5. Spec: required elements + search params listed

## ImagingStudy discovery

| Present | Missing / weak |
|---------|----------------|
| Firely ModelInfo, search-parameters, compartment.json, SQL ResourceType seed, `imagingstudy-example.json` | `KnownResourceTypes` const; often clinic E2E + FHIR-10 required-field enforcement |

KnownResourceTypes ≠ API allowlist.

## Steps

| # | Action | Primary path |
|---|--------|--------------|
| 1 | Const | `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs` |
| 2 | Search | `Data/{version}/search-parameters.json` + converters only if needed |
| 3 | Conformance | Verify `GET /metadata` (ModelInfo-driven) |
| 4 | Validators | Generic pipeline; FHIR-10 for ImagingStudy clinic creates |
| 5 | Tests | Unit (NSubstitute) + E2E (`TestFhirClient`) — FHIR-02 |
| 6 | REST | POST/GET + `GET /Patient/{id}/ImagingStudy` |

## Rules

FHIR-00 · FHIR-01 · FHIR-02 · (ImagingStudy: FHIR-10+) · architecture-explained.md
