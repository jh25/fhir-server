# Remove FHIR resource type — step card

Companion to [SKILL.md](SKILL.md). Pairs with [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md).

## Prompts

1. Which type?
2. Version? (R4 default)
3. Added via add-fhir-resource-type on this branch?
4. Goal: undo wiring · hide from `/metadata` · git rollback
5. Preserve `dbo.Resource`? **Must be yes**

## Steps

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
