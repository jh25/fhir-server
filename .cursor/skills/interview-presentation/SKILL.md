---
name: interview-presentation
description: >-
  Generate a live, auto-updating MidSizedClinic Interview Presentation Canvas
  for Solutions Architect interviews. Auto-discovers .cursorignore,
  .cursorindexingignore, .cursor/rules/*.mdc, and .cursor/skills/*/SKILL.md,
  extracts metadata, and stitches them into the five-section layered narrative.
  Use when the user runs /interview-presentation, /presentation or /demo, or
  says "show the kit", "what's the story", or interview demo.
disable-model-invocation: false
---

# MidSizedClinic Interview Presentation

Generate a live, auto-updating presentation titled **MidSizedClinic Interview
Presentation**. This is the Solutions Architect interview demo — it runs during
the technical round, proving the kit works by showing its own architecture live.

**Audience:** Solutions Architects

They want to see: judgment about priorities, SDLC breadth, guardrail thinking, and
runnable proof — not slides.

## Narrative Arc (fixed — do not add sections)

1. The Problem (ramp time, convention drift, review burden)
2. The Solution (three layers: boundary + rules + skills)
3. The Measurements (before/after convention adherence scores)
4. Multi-role Entry Points (same kit, different doors: setup, first-contribution, tests)
5. Account Value (land → expand → retain)

Ruthlessly cut anything outside this arc. Output is **ONE Canvas per invocation**.

## Design Principle

Use the Canvas format already established for MidSizedClinic (three-card
problem, visual tree for layers, data table + chart, multi-role grid, account callout).
That layout communicated without narration — replicate that clarity.

Full component recipe: [layout-spec.md](layout-spec.md). Read it before writing the Canvas.

## Workflow (every invocation — live, never reuse a stale story)

Copy this checklist and track it:

```
Presentation:
- [ ] 1. Discover kit files
- [ ] 2. Extract metadata (count Y vs Z)
- [ ] 3. Map into the five arc buckets
- [ ] 4. Load measurements (real or defaults)
- [ ] 5. Write/overwrite the Canvas
- [ ] 6. Narrate X/Y/Z + link the Canvas
```

### 1. Discover kit files

From the **repo root**, gather the inventory with Glob / Read (do not hardcode today's file list):

| Class | Globs / paths |
|-------|----------------|
| Boundary | `.cursorignore`, `.cursorindexingignore` |
| Rules | `.cursor/rules/**/*.mdc` |
| Skills | `.cursor/skills/**/SKILL.md` |

Include this skill in the skill count — self-inclusion is the proof.

Skip skill *supporting* files (scripts, yaml, json) except when loading measurements defaults. They are not narrative nodes.

### 2. Extract metadata (real shapes in this repo)

**Skills (`SKILL.md`)** — YAML frontmatter between `---` lines:

| Field | Use |
|-------|-----|
| `name` | Door id / pill label |
| `description` | Card body (truncate to one sentence for the grid) |
| `disable-model-invocation` | Optional; ignore for the story |

If frontmatter missing: `name` = parent folder name; `description` = first non-empty `#` heading or first paragraph; mark **inferred**.

**Rules (`*.mdc`)** — YAML frontmatter:

| Field | Use |
|-------|-----|
| `description` | Rule one-liner |
| `globs` | Scope hint |
| `alwaysApply` | Pill: always vs path-scoped |

If frontmatter missing: `description` from first `#` heading or filename stem; mark **inferred**.

**Boundary files** — no frontmatter. Metadata is the leading `#` comment block before the first pattern line:

- Purpose = first contiguous comment block (compress to ≤2 sentences)
- Signal = count of non-empty, non-`#` pattern lines
- Distinguish the two files: `.cursorignore` = access boundary; `.cursorindexingignore` = index noise only (files stay readable)

If comments are absent: purpose = filename-based guess; mark **inferred**.

### 3. Map into the arc

| Arc section | Source |
|-------------|--------|
| Problem | Fixed three themes (ramp / conventions / review) — wording may cite discovered gaps (e.g. "0 rules yet") but do not invent a fourth theme |
| Solution tree | boundary artifacts → rules → skills (live counts + names) |
| Measurements | See step 4 |
| Entry points | Prefer skills named `local-setup`, `first-contribution`, `strengthen-tests`; Planned if absent |
| Account value | Fixed land → expand → retain; bind "Land" to boundary files actually present |

### 4. Measurements

1. If `.cursor/eval/convention-scores.json` exists, use it (same shape as defaults).
2. Else use [measurements.defaults.json](measurements.defaults.json) and keep the illustrative caption.

Compute per run: `aggregate = mean(scores)`, `delta = aggregate - baselineAggregate`.

### 5. Write the Canvas

- Path and layout: [layout-spec.md](layout-spec.md)
- Embed the inventory snapshot as constants in the `.canvas.tsx` (no network)
- Fix Canvas TypeScript check errors before finishing (`Card` has no `key` prop — wrap in `<div key=...>`; `BarChart` has no `title` — use `H3` above it)
- Read the canvas skill if unsure about `cursor/canvas` APIs

### 6. Narrate the tradeoff (required in chat)

Say exactly this pattern with real integers filled in:

> Found X files, Y had metadata, Z were inferred — here's the story anyway.

Then link the Canvas with a markdown link to its absolute `.canvas.tsx` path. One sentence: open it beside the chat for the live demo.

## Key Constraints

- **LIVE** — re-discover and regenerate on every trigger; never present screenshots or a memorized file list as current truth
- **Self-documenting proof** — auto-discovery is the whole point; the Canvas must reflect files that exist *now*
- **Arc fit** — five sections only
- **One Canvas** — overwrite the same output path; no multi-page deck

## Anti-patterns

- Static slides, Mermaid-only dumps, or markdown tables in chat instead of a Canvas
- Padding with AGENTS.md / CONTRIBUTING.md tours (out of arc)
- Hiding inferred items — show them and increment Z
- Skipping the X/Y/Z sentence
- Creating helper canvases or extra sections for "more skills"
