---
name: requirement-to-tasks
description: >-
  Guides engineers, PMs, and QA through translating a MidSizedClinic requirement
  into clean technical tasks with development and QA automation paired. Takes a
  requirement (e.g. "Look up prior studies at check-in"), breaks it into discrete
  executable tasks with clear dependencies, steps, outcomes, and test specs.
  Each dev task includes paired QA automation (unit, E2E, integration, smoke);
  QA is a peer to dev, not downstream — test specs defined upfront. References
  Cursor skills/patterns (add-fhir-resource-type, local-setup, strengthen-tests,
  etc.). Use when the user runs /requirement-to-tasks, asks to break down a
  clinic requirement, wants a PM→eng→QA task plan, or says "turn this into
  tickets/tasks with tests."
disable-model-invocation: false
---

# Requirement → Dev + QA Tasks

Guide **engineers, PMs, and QA** through translating a MidSizedClinic requirement
into **clean technical tasks with development and QA automation paired**.

**Outcome:** requirement → discrete **dev+QA** tasks → execution via Cursor
skills / patterns (not a vague backlog dump).

**Audience:** PM, engineer, QA — anyone at MidSizedClinic turning requirements
into trackable work.

**Core rule:** QA is a **peer to dev, not downstream**. Every development task
ships with **test specs defined upfront** (unit / E2E / integration / smoke as
appropriate). No “implement first, invent tests later.”

Pairs with execution skills:
[add-fhir-resource-type](../add-fhir-resource-type/SKILL.md),
[remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md),
[local-setup](../local-setup/SKILL.md),
[local-teardown](../local-teardown/SKILL.md),
[pre-review-patterns](../pre-review-patterns/SKILL.md),
[strengthen-tests](../strengthen-tests/SKILL.md),
[architecture-overview](../architecture-overview/SKILL.md),
[product-owner-overview](../product-owner-overview/SKILL.md).

Follow **FHIR-00**, **FHIR-01**, **FHIR-02**. Depth:
[architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md),
[testing-patterns-explained.md](../../docs/midsizedclinic/rule-explanations/testing-patterns-explained.md).

## Multi-audience value

| Role | What they get |
|------|----------------|
| **PM** | Requirement stays in clinic language; tasks map to outcomes they can track |
| **Engineer** | Executable steps + skill/pattern links (no rediscovery crawl) |
| **QA** | Automation specs **with** the task — peer, same definition of done |

Do **not** produce eng-only tickets that bury acceptance criteria, or QA-only
suites that invent behavior the PM never asked for.

## Interactive prompts (required — ask before writing tasks)

Answer one at a time when possible:

```
1. What is the requirement? (clinic language OK)
   e.g. "Look up prior studies at check-in"

2. Who is the primary consumer of this plan? (PM / engineer / QA / all)

3. FHIR version / host? (default R4)

4. Scope boundary this pass?
   Server only · Demo app only · Server + demo · Discovery only (no code plan)

5. Constraints? (HIPAA/PHI, no hard-delete, leave Design: SQL until REST wired, deadline, …)
```

If the requirement is already in the user message, lock it and continue from 2–5.

## Workflow

```
Requirement → tasks:
- [ ] 0. Prompts locked; restate requirement in one clinic sentence + one tech sentence
- [ ] 1. Diagnose level (spec / codebase / clinic app) — reuse add-fhir three-level lens
- [ ] 2. Split into discrete tasks (dependencies explicit)
- [ ] 3. For EACH task: pair Dev steps + QA automation specs upfront
- [ ] 4. Attach Cursor skills / rules / docs to each task
- [ ] 5. SDLC quality gates (built-in; not a separate afterthought)
- [ ] 6. Hand-off summary (PM trackable checklist)
```

### 0. Dual restatement

Always output:

- **Clinic:** one sentence a tech/radiologist would recognize.
- **Tech:** one sentence naming the primary API/surface (e.g. compartment
  `GET /Patient/{id}/ImagingStudy`) — secondary to clinic wording for PMs.

### 1. Diagnose before splitting

| Level | Question | Typical MidSizedClinic signal |
|-------|----------|--------------------------------|
| **1 Spec** | Does FHIR/Firely already define it? | ImagingStudy in R4 `search-parameters` / compartment |
| **2 Codebase** | Server wired + clinic validators + tests? | `KnownResourceTypes`, FHIR-10 validator, unit/E2E |
| **3 Clinic** | Apps use FHIR REST (not SQL bypass)? | Demo worklist `Design: SQL` → `Design: FHIR` |

Label gaps honestly. Do not invent upstream Microsoft backlog items.

### 2–3. Task card template (required shape)

Emit tasks as `T-1`, `T-2`, … Copy this shape **verbatim for each task**:

```markdown
### T-{n}: {short title}

| Field | Content |
|-------|---------|
| **Owner** | Eng · QA · Eng+QA |
| **Depends on** | T-{m} / none |
| **Clinic outcome** | What the user can do when this task is done |
| **Tech outcome** | Observable system change (API, UI, data path) |

**Dev steps**
1. …
2. …

**QA automation (peer — define now)**
| Layer | Spec (arrange / act / assert in clinic+tech terms) | Pattern |
|-------|-----------------------------------------------------|---------|
| Unit | … | xUnit + NSubstitute; FHIR-02 naming |
| E2E | … | `TestFhirClient` / HTTP fixture when HTTP-visible |
| Integration | … | only if store/host wiring must be proven |
| Smoke | … | local-setup: curl /metadata, demo load, Design indicator |

**Skills / patterns**
- `/skill-name` or rule FHIR-0x — why it applies

**Done when**
- [ ] Dev outcome true
- [ ] QA specs green (or explicitly waived with reason)
```

**Rules for pairing**

- Every task with code has at least one automation row (unit and/or E2E).
- Pure PM/docs tasks may use **Smoke** / manual checklist only — say so.
- Prefer **unit for Core/handler logic**, **E2E for HTTP**, **smoke for demo UI**.
- Never duplicate the same assertion in unit + E2E (FHIR-02).

### 4. Skill / pattern map (attach, don’t rediscover)

| Need | Skill / artifact |
|------|------------------|
| Wire ImagingStudy (const, FHIR-10, tests) | [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md) |
| Undo wiring; keep `dbo.Resource` | [remove-fhir-resource-type](../remove-fhir-resource-type/SKILL.md) |
| Run FHIR + SQL + demo | [local-setup](../local-setup/SKILL.md) |
| Tear down local env | [local-teardown](../local-teardown/SKILL.md) |
| Pre-PR anti-patterns | [pre-review-patterns](../pre-review-patterns/SKILL.md) |
| Strengthen weak tests | [strengthen-tests](../strengthen-tests/SKILL.md) |
| Architecture for leads | [architecture-overview](../architecture-overview/SKILL.md) |
| PO clinic outcomes | [product-owner-overview](../product-owner-overview/SKILL.md) |
| Demo still on SQL | `midsizedclinic-demo-app` · header `#design-indicator` (`Design: SQL`) |
| Swap indicator after REST | Single text change → `Design: FHIR` in `public/index.html` |
| Medino / store / authz | FHIR-00 |
| PHI / audit / compartments | FHIR-01 |
| xUnit / NSubstitute / AAA | FHIR-02 |
| Imaging check-in contracts | FHIR-10–13 (clinic rules) |

If a named skill does not exist yet (e.g. a future `wire-midsizedclinic-to-fhir-rest`),
**say so**, point at concrete files (`midsizedclinic-demo-app/db/imagingStudies.js`,
routes, `#design-indicator`), and keep the task executable anyway.

### 5. SDLC quality gates (built into the plan)

Every plan ends with this gate block (adapt checkmarks to scope):

```
SDLC gates:
- [ ] FHIR-00: no business logic in controllers; IFhirDataStore; authz first
- [ ] FHIR-01: no PHI in logs; compartment preserved; audit context on store calls
- [ ] FHIR-02: xUnit + NSubstitute; AAA; unit vs E2E not duplicated
- [ ] /pre-review-patterns before PR
- [ ] /strengthen-tests if coverage thin
- [ ] local-setup smoke if HTTP or demo touched
- [ ] Design indicator matches data path (SQL vs FHIR)
```

### 6. PM hand-off summary

Close with a short trackable list:

```
Requirement: …
Tasks: T-1 … T-n (owners)
Blocked by: …
Demo / patient visible win: …
Risks / explicit non-goals: …
```

## Example (shape only — regenerate for live requirements)

**Requirement:** Look up prior studies at check-in.

| Task | Dev (summary) | QA peer (summary) | Skills |
|------|---------------|-------------------|--------|
| T-1 | Confirm R4 ImagingStudy compartment search works on server | E2E: create two patients’ studies; compartment returns only open patient | add-fhir-resource-type (re-verify), FHIR-02, local-setup |
| T-2 | FHIR-10 create validation if missing | Unit: reject incomplete ImagingStudy; accept clinic-valid | add-fhir-resource-type A+B+C |
| T-3 | Demo worklist: SQL → `GET /Patient/{id}/ImagingStudy` | Smoke: load worklist; assert `#design-indicator` → `Design: FHIR` | local-setup; demo-app files |
| T-4 | Pre-PR + strengthen | pre-review-patterns; strengthen-tests | those skills |

Expand each into full task cards using the template above when executing this skill.

## Anti-patterns

- Eng tasks without QA specs (“QA will add later”)
- QA suites that redefine product behavior
- Mega-tasks with hidden dependencies
- Teaching “add KnownResourceTypes ⇒ enables CRUD” (false for Firely types)
- Planning hard-delete of `dbo.Resource` to “unregister” a type
- Ignoring `#design-indicator` when changing demo data path
- Inventing Microsoft roadmap items not in catalog / upstream issues

## Done when

- [ ] Prompts answered; clinic + tech restatement present
- [ ] Discrete tasks with dependencies
- [ ] Every code task has paired QA automation upfront
- [ ] Skills/patterns linked per task
- [ ] SDLC gates listed
- [ ] PM hand-off summary present
- [ ] Engineer can execute T-1 without rediscovering the tree

## References

| Doc / skill | Use |
|-------------|-----|
| [checklist.md](checklist.md) | Printable prompt + task-card + gates |
| [examples.md](examples.md) | Fuller check-in breakdown |
| FHIR-00 / FHIR-01 / FHIR-02 | Architecture, PHI, testing |
| [architecture-explained.md](../../docs/midsizedclinic/rule-explanations/architecture-explained.md) | Depth for eng |
| [testing-patterns-explained.md](../../docs/midsizedclinic/rule-explanations/testing-patterns-explained.md) | QA + eng test depth |
| [product-owner-overview](../product-owner-overview/SKILL.md) | Clinic outcome language |
