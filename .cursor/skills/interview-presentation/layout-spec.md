# Canvas layout spec (do not invent a new composition)

Replicate the MidSizedClinic Interview Presentation canvas clarity. One file, one screen, four sections only — plus a short title-area frame (not a fifth section).

**Output path** (overwrite in place every run):

`~/.cursor/projects/<workspace>/canvases/midsizedclinic-interview-presentation.canvas.tsx`

On this machine the workspace folder is typically `d-code-fhir-server`.

**Imports:** only `cursor/canvas`. Default-export one component. Embed discovered data inline — no `fetch()`.

**Voice:** plain English. Software-delivery audience; do not assume Fast Healthcare
Interoperability Resources (FHIR) fluency. First mention of FHIR in the Canvas must
use the full name, then the acronym.

## Title + Why this repo first

`H1`: MidSizedClinic Interview Presentation

Subtitle: *How we make AI safe and useful on a hard healthcare codebase — live from this repo’s kit, not a static deck.*

Callout with the required tradeoff line:

> Found X files, Y had metadata, Z were inferred — here's the story anyway.

Then a **Why this repo first** card (required, keep tight):

| Point | Plain English |
|-------|----------------|
| Hard on purpose | Microsoft Fast Healthcare Interoperability Resources (FHIR) Server is convention-heavy. Generic .NET habits miss house layers and FHIR-spec rules. |
| Healthcare cost of being wrong | If you do not know healthcare, patient data and HIPAA make bad suggestions expensive. |
| Why start here | A kit that works *here* proves more than a kit on a toy app. |
| Cursor + BAA | We use Cursor with HIPAA/BAA awareness for eligible programs — compliance for the AI product itself. |
| Extra constraint | We still block patient-shaped paths and secrets from the agent feed via `.cursorignore`, so PHI does not become AI context. Synthetic fixtures stand in for real extract locations. |

Pills under the frame for live counts: boundary / rules / skills / MCP.

## 1. The Problem — three equal cards

`H2` + one plain-English lead line: *What goes wrong without a kit on this repo.*

`Grid columns={3}` of `Card` / `CardHeader` / `CardBody`:

| Card header | Body focus (plain English) |
|-------------|----------------------------|
| Ramp | New people (and agents) burn days getting FHIR + SQL running locally |
| Conventions | Without house guidance, AI writes “normal .NET” and drifts from this server’s patterns |
| Review + trust | Seniors re-teach PHI, layering, and tests every PR — and security still asks what the AI can see |

No fourth problem card. No emoji.

## 2. The Solution — visual tree + layer copy

`H2` + short secondary line: four layers — **keep PHI out · teach the house way · give people a door · pull outside tools when needed**  
(Technical names still OK as layer labels: boundary + rules + skills + MCP.)

Left: SVG tree via `computeDAGLayout` (vertical), four nodes:

1. `boundary` — `.cursorignore` + `.cursorindexingignore`
2. `rules` — `.cursor/rules/*.mdc` (empty → "none yet")
3. `skills` — `.cursor/skills/*/SKILL.md`
4. `mcp` — servers from `.cursor/mcp.json` (empty → "none configured")

Edges: `boundary → rules → skills → mcp`.

Right: four `H3` blocks from real inventory.

**Boundary block must say in plain English:**

- `.cursorignore` = the AI must not see these paths (access block) — patient-shaped test data, local secrets
- `.cursorindexingignore` = still readable, just out of noisy search
- This is **in addition to** Cursor BAA/HIPAA product posture — defense in depth for customers

**MCP block** (no secrets):

| Server | Transport | Toolsets | Wired skills | Status |

Status: `ready` only if verified this run; else `configured`.

Optional before/after `DiffView` — After side may mention PHI blocked + role skill + MCP if discovered.

## 3. Multi-role Entry Points — grouped doors, audience pills on every card

`H2` + line: same kit, different front doors — pick the job, not a 40-page wiki.

**Do not** render one flat wall of every skill. **Group** discovered skills under four journey headings (`H3`), then a compact card grid (2–3 columns) inside each group. Still show **every** discovered skill — grouping is for scanability, not hiding.

### Groups (fixed order)

| Group `H3` | Intent | Skills (default membership) |
|------------|--------|------------------------------|
| **Run the stack** | Get FHIR + demo up, tear down, deploy, retarget | `local-setup`, `local-teardown`, `deploy-to-dev`, `switch-app-to-local`, `switch-app-to-dev` |
| **Build & extend** | Architecture and server/demo coding | `architecture-overview`, `add-fhir-resource-type`, `remove-fhir-resource-type`, `execute-dev-tasks`, `interview-presentation` |
| **Plan & product** | Clinic outcomes and task breakdown | `product-owner-overview`, `requirement-to-tasks` |
| **Prove quality** | Review, tests, QA verification | `pre-review-patterns`, `strengthen-tests`, `execute-qa-tasks` |

Any newly discovered skill not in the table: place it in the best-fit group by audience (DevOps → Run; Engineering → Build; PO → Plan; QA → Prove). If unclear, **Build & extend**. Never drop a discovered skill.

Optional legend row of audience pills (`DevOps` · `Engineering` · `PO` · `QA`) under the section lead — **in addition to** pills on each card.

### Each card (unchanged elements — pills required)

| Element | Content |
|---------|---------|
| Header | `/skill-name` path |
| Audience tag(s) | **Always** one or more Pills: `QA` · `Engineering` · `PO` · `DevOps` — even when the parent group already implies a role (e.g. `switch-app-to-dev` under Run the stack still shows `DevOps` · `Engineering`) |
| Status | Ready / Planned |
| Body | One-line plain description from skill metadata (or fallback) |
| Footer | `Code` path + Open button when Ready; MCP pills when wired |

**Default audience mapping** (override only if skill description clearly says otherwise):

| Skill / door | Audience tag(s) |
|--------------|-----------------|
| `local-setup` | DevOps |
| `local-teardown` | DevOps |
| `deploy-to-dev` | DevOps |
| `switch-app-to-local` | DevOps · Engineering |
| `switch-app-to-dev` | DevOps · Engineering |
| `pre-review-patterns` | QA |
| `strengthen-tests` | QA |
| `execute-qa-tasks` | QA |
| `architecture-overview` | Engineering |
| `add-fhir-resource-type` | Engineering |
| `remove-fhir-resource-type` | Engineering |
| `execute-dev-tasks` | Engineering |
| `requirement-to-tasks` | Engineering · PO · QA |
| `interview-presentation` | Engineering |
| `product-owner-overview` | PO |

Union rule: start from the mapping table + every discovered `.cursor/skills/*/SKILL.md`. Deduplicate by skill name. Within each group, sort Ready first, then by name.

Do **not** replace audience pills with group-only labels. Groups organize; pills still answer “who is this door for?”

## 4. Account Value — three cards + one callout

`H2` + land → expand → retain in customer language:

| Pill | Header | Point |
|------|--------|-------|
| Land | Prove trust first | Ship the PHI boundary + show BAA-aware Cursor use — security gets an artifact, not a slide |
| Expand | Encode the house way | Add role skills/rules (and MCP bridges) so each job pulls what it needs |
| Retain | Survive the champion | The story re-discovers itself from the kit; review cost compounds down |

Close with `Callout tone="info"`: BAA covers the product relationship; `.cursorignore` covers what enters the model — review those layers independently.

## Design constraints (canvas skill)

- Colors from `useHostTheme()` only — no hex, no gradients, no box-shadows, no emoji
- Mix open `H2` sections with cards
- No empty-state placeholders; keep four section headings; MCP node stays with "none configured" when empty
- Never embed secrets from `mcp.json`
- Never claim test fixtures are real PHI or that ignore files alone equal HIPAA certification
- Never add fake measurements / convention-score charts
- Link the finished canvas in the chat reply with a markdown path link
