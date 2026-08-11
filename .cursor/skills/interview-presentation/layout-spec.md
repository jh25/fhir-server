# Canvas layout spec (do not invent a new composition)

Replicate the MidSizedClinic Interview Presentation canvas clarity. One file, one screen, five sections only.

**Output path** (overwrite in place every run):

`~/.cursor/projects/<workspace>/canvases/midsizedclinic-interview-presentation.canvas.tsx`

On this machine the workspace folder is typically `d-code-fhir-server`.

**Imports:** only `cursor/canvas`. Default-export one component. Embed discovered data inline — no `fetch()`.

## Title

`H1`: MidSizedClinic Interview Presentation

Subtitle: layered onboarding story, live-discovered from `.cursor` (not a static deck).

Callout or caption with the required tradeoff line:

> Found X files, Y had metadata, Z were inferred — here's the story anyway.

## 1. The Problem — three equal cards

`H2` + `Grid columns={3}` of `Card` / `CardHeader` / `CardBody`:

| Card header | Body focus |
|-------------|------------|
| Ramp | ramp time to a working local FHIR + SQL environment |
| Conventions | convention drift (generic .NET vs house layers / Shared / Medino) |
| Review | review burden (re-teaching PHI, layering, tests every PR) |

No fourth problem card. No emoji.

## 2. The Solution — visual tree + layer copy

`H2` + short secondary line: three layers — **boundary + rules + skills**.

Left: SVG tree via `computeDAGLayout` (vertical), three nodes:

1. `boundary` — `.cursorignore` + `.cursorindexingignore` (from inventory)
2. `rules` — `.cursor/rules/*.mdc` (count + short names from inventory; empty → "none yet")
3. `skills` — `.cursor/skills/*/SKILL.md` (count + names)

Right: three `H3` blocks, each populated from extracted descriptions (not invented marketing). List real file paths with `Code`.

Optional before/after: two-column `DiffView` (Before = main only / After = layered kit) — keep tight; do not add a sixth section.

## 3. The Measurements — stats + table + chart

`H2` + three `Stat`s (baseline aggregate, kit mean aggregate, mean Δ).

`Table`: runs 1–5, one column per convention, Aggregate, Δ vs main.

`BarChart` under an `H3` (BarChart has **no** `title` prop). Reference line at baseline.

Prefer `.cursor/eval/convention-scores.json` if present; else load defaults from [measurements.defaults.json](measurements.defaults.json) and keep the illustrative caption.

## 4. Multi-role Entry Points — three-column grid

`H2` + line: same kit, different doors.

Exactly three doors (map discovered skills by `name` / path; mark missing as Planned):

| Door path | Role | Prefer skill name |
|-----------|------|-------------------|
| `/local-setup` | Platform / new hire | `local-setup` |
| `/first-contribution` | Feature contributor | `first-contribution` |
| `/strengthen-tests` | QA / reliability | `strengthen-tests` |

Each cell: `Card` with path as header, Ready/Planned pill, one-line description from skill metadata (or inference), `Code` path, `Button` + `useCanvasAction` `openFile` when the skill exists.

Other discovered skills (teardown, this presentation skill, etc.) may appear as compact `Pill`s under the grid — do **not** add a new section.

## 5. Account Value — three cards + one callout

`H2` + land → expand → retain:

| Pill | Header | Point |
|------|--------|-------|
| Land | Prove the path | Ship boundary files first — verifiable HIPAA-aware access |
| Expand | Encode the house way | Add role skills/rules so teams pull by job |
| Retain | Compound the review | Conventions live in the kit; story survives the champion |

Close with one `Callout tone="info"`: layers review independently (boundary without waiting on skills).

## Design constraints (canvas skill)

- Colors from `useHostTheme()` only — no hex, no gradients, no box-shadows, no emoji
- Mix open `H2` sections with cards — not a wall of identical cards for every block
- No empty-state placeholders; omit a widget only if an entire data class is absent (still keep the five section headings)
- Link the finished canvas in the chat reply with a markdown path link
