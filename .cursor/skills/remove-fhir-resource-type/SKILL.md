---
name: remove-fhir-resource-type
description: >-
  Guides engineers through reversing a FHIR resource-type wiring change on the
  Microsoft FHIR Server without deleting stored data: interactive prompts, then
  KnownResourceTypes const removal, search/conformance cleanup, validators,
  tests, /metadata verification, and dbo.Resource preservation. Use when the
  user runs /remove-fhir-resource-type, says "unregister a resource type",
  "undo add-fhir-resource-type", or wants an add/remove test cycle.
disable-model-invocation: false
---

# Remove FHIR Resource Type

Interactive guide for an **engineer testing resource framework changes**.
**Unregister only — do not hard-delete clinical data.**

Pairs with [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md). Follow
**FHIR-00** and **FHIR-02**. For a full code rollback of an add attempt, prefer
**git** (`git revert` / restore files) over hand-editing HL7 embedded data.

## What this skill undoes (and what it does not)

| Undo (safe unregister) | Do **not** do |
|------------------------|---------------|
| Remove `KnownResourceTypes` const you added | `DELETE` / hard-delete rows in `dbo.Resource` |
| Remove clinic-only validators / special-case routes you added | Strip HL7 `search-parameters.json` / `compartment.json` entries for a standard type |
| Remove unit/E2E tests you added for the type | Drop `dbo.ResourceType` seed rows (harmless leftovers are OK) |
| Optional: filter type out of `GetResourceTypeNames()` / `IsKnownResource` for local experiments | Claim “removed KnownResourceTypes ⇒ gone from `/metadata`” — **false** for Firely types |

**Truth:** Firely `ModelInfo` still knows standard types (e.g. ImagingStudy). Removing
a const alone does **not** unregister the API. To hide a type from routing +
CapabilityStatement for a test cycle, add an explicit filter in
`VersionSpecificModelInfoProvider` (see step 3) — or git-revert the whole add.

Data in **`dbo.Resource`** (and search index tables) is **preserved** so the type
can be re-added later via add-fhir-resource-type.

## Interactive prompts (required — ask before coding)

```
Remove resource type work:
- [ ] 1. Which resource type to unregister?
- [ ] 2. FHIR version host? (default R4)
- [ ] 3. Was this type added via add-fhir-resource-type in this branch? (yes / no)
- [ ] 4. Goal: undo our wiring only | also hide from /metadata for experiment | full git rollback
- [ ] 5. Confirm: preserve dbo.Resource data (required: yes)
```

Refuse hard-delete unless the engineer explicitly overrides after a clear warning
(out of scope for MidSizedClinic PHI — prefer soft-delete / leave rows).

If they want **full rollback** of a messy add: stop the file walk and use git
(`git status`, revert the add commit or restore touched files), then skip to
verify `/metadata` + confirm data still present.

## Workflow checklist

```
Remove / unregister resource type:
- [ ] 0. Prompts + locate what *we* added (git diff / blame)
- [ ] 1. Remove KnownResourceTypes const
- [ ] 2. Remove search / conformance wiring *we* added
- [ ] 3. Remove validators / filters *we* added (optional metadata hide)
- [ ] 4. Remove tests *we* added
- [ ] 5. Verify /metadata (and routes) match the goal
- [ ] 6. Confirm data remains in the database
```

### 1. Remove const from KnownResourceTypes

File: `src/Microsoft.Health.Fhir.Core/Models/KnownResourceTypes.cs`

- Delete `public const string {Type} = "{Type}";` if present.
- Grep the solution for `KnownResourceTypes.{Type}` and fix call sites.
- Reminder: this alone does **not** remove the type from Firely or `/metadata`.

### 2. Remove search param / conformance wiring

Only reverse **our** changes:

- Custom entries in `ms-search-parameters.json` or `unsupported-search-parameters.json`
  added for the experiment — remove those lines.
- **Do not** delete standard HL7 blocks from `search-parameters.json` /
  `compartment.json` for types that ship with Firely (e.g. ImagingStudy).
- CapabilityStatement is driven by `GetResourceTypeNames()` — no separate
  “unregister list” in KnownResourceTypes. If step 3 does not filter the type,
  it will still appear in `/metadata`.

### 3. Remove validators (and optional metadata hide)

- Remove clinic/custom validators or FluentValidation rules added for the type
  (e.g. FHIR-10 ImagingStudy required-field experiments).
- Leave the generic create/upsert validation pipeline intact.
- **Optional experiment — hide from API:** filter the type name out of
  `IsKnownResource` / `GetResourceTypeNames()` in
  `src/Microsoft.Health.Fhir.Shared.Core/VersionSpecificModelInfoProvider.cs`
  (same pattern as R5 excluding `Citation`). Document clearly that this is a
  **local/test filter**, not a product default. Remove the filter when done.
- Special-case `KnownRoutes` / CapabilityStatement exceptions: revert only if
  you added them.

### 4. Remove tests

- Delete or revert **unit + E2E** tests and samples added for the type
  (FHIR-02 naming/scope still applies to anything you keep).
- Do not delete shared fixtures used by unrelated tests
  (e.g. keep `imagingstudy-example.json` if other suites rely on it — only
  remove tests *you* added for the wiring experiment).

### 5. Verify resource status vs `/metadata`

Restart/rebuild the R4 host, then:

```http
GET /metadata
GET /{ResourceType}   # expect 404 / not-supported if hidden via ModelInfo filter
```

| Goal | Expect |
|------|--------|
| Const + tests only removed | Type **still** in `/metadata` (Firely) — OK |
| ModelInfo filter applied | Type **absent** from CapabilityStatement `rest.resource` |
| Git full revert of add | Matches pre-add baseline |

If the engineer expected “const removed ⇒ gone from metadata” and it is still
listed, explain Firely `ModelInfo` and offer the optional filter or git rollback.

### 6. Confirm data remains in the database

Against the local SQL used by local-setup (read-only checks):

```sql
-- Type still registered in catalog (seed row may remain — OK)
SELECT * FROM dbo.ResourceType WHERE Name = N'{ResourceType}';

-- Instance data preserved (adjust IsHistory / IsDeleted filters as needed)
SELECT TOP 20 ResourceTypeId, ResourceId, IsDeleted, IsHistory
FROM dbo.Resource r
INNER JOIN dbo.ResourceType rt ON r.ResourceTypeId = rt.ResourceTypeId
WHERE rt.Name = N'{ResourceType}';
```

- **Pass:** rows still present; no hard-delete ran.
- Re-add later with [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md)
  (const + tests + any clinic validation); existing rows remain addressable once
  the type is exposed again.

Do **not** run `DELETE FROM dbo.Resource` or store `HardDelete` as part of this
skill.

## References

| Doc / rule | Use |
|------------|-----|
| [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md) | Re-add / forward path |
| [.cursor/rules/FHIR-00-architecture-patterns.mdc](../../rules/FHIR-00-architecture-patterns.mdc) | No SQL in handlers; Medino; authz |
| [.cursor/rules/FHIR-02-testing-patterns.mdc](../../rules/FHIR-02-testing-patterns.mdc) | Test cleanup standards |
| git | Full rollback of a bad add |
| [checklist.md](checklist.md) | Printable step card |

## Anti-patterns

- Hard-deleting FHIR resources to “unregister” a type
- Editing HL7 `search-parameters.json` to remove a standard type
- Assuming KnownResourceTypes controls `/metadata`
- Leaving a ModelInfo hide-filter in a PR meant for upstream merge
- Skipping the DB preservation check after a remove cycle

## Done when

- [ ] Prompts answered; preserve-data confirmed
- [ ] Our wiring (const / custom search / validators / tests) removed or git-reverted
- [ ] `/metadata` matches the stated goal (still present vs filtered out)
- [ ] SQL shows `dbo.Resource` rows for the type still exist
- [ ] Engineer knows how to re-add via add-fhir-resource-type
