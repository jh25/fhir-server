---
name: interview-presentation
description: >-
  Generate a live, auto-updating MidSizedClinic Interview Presentation Canvas
  for Solutions Architect interviews. Explains in plain English why this
  convention-heavy FHIR server is the right first kit, how Cursor BAA/HIPAA
  fits, and how .cursorignore keeps PHI out of the AI feed. Auto-discovers
  boundary files, rules, skills, and mcp.json. Use when the user runs
  /interview-presentation, /presentation or /demo, or says "show the kit",
  "what's the story", or interview demo.
disable-model-invocation: false
---

# MidSizedClinic Interview Presentation

Generate a live, auto-updating presentation titled **MidSizedClinic Interview
Presentation**. This is the Solutions Architect interview demo — it runs during
the technical round, proving the kit works by showing its own architecture live.

**Audience:** Solutions Architects

They want to see: judgment about priorities, why this codebase first, HIPAA-aware
AI use (BAA + extra PHI constraints), guardrail thinking, and runnable proof —
not slides dense with jargon.

For FHIR Server system architecture (layers, request flow, persistence) — not
the kit story — use [architecture-overview](../architecture-overview/SKILL.md).

## Narrative Arc (fixed — do not add sections)

1. The Problem (ramp time, convention drift, review burden) — plain English
2. The Solution (four kit layers: boundary + rules + skills + MCP)
3. The Measurements (before/after convention adherence scores)
4. Multi-role Entry Points (same kit, different doors: setup, first-contribution, tests)
5. Account Value (land → expand → retain)

**Before section 1**, under the title: a short **Why this repo first** frame
(not a sixth section) — see layout-spec.

Ruthlessly cut anything outside this arc. Output is **ONE Canvas per invocation**.
MCP belongs inside section 2 (and optionally as pills under section 4) — never a
sixth section.

## Plain English (required)

Write for someone who knows software delivery but may not know FHIR or healthcare.
Prefer short sentences. Explain acronyms once. Avoid leading with Medino, Shared/#if,
or controller names — those can appear as secondary detail after the point lands.

## Why this repo first (required framing)

Embed this judgment in the title area (and echo it in Problem / Land). Do not invent
clinic history beyond what MidSizedClinic materials say.

**Logic to convey:**

1. **FHIR Server is convention-heavy.** House rules (layers, Shared multi-targeting,
   handler patterns, FHIR-spec-first behavior) are easy for a generalist agent to miss.
2. **Healthcare is hard if you do not already know it.** Patient data, imaging
   workflows, and HIPAA change the cost of a wrong suggestion.
3. **That makes it a good first kit.** If the kit works here — where mistakes are
   expensive — the pattern transfers to simpler repos. Choosing a toy CRUD app would
   not prove the same thing.

## HIPAA, Cursor BAA, and PHI constraints (required)

Show two complementary points — do not collapse them into one claim:

| Layer | What to say | What not to say |
|-------|-------------|-----------------|
| **Cursor + BAA** | We understand Cursor can be used under a Business Associate Agreement (BAA) for eligible HIPAA programs — enterprise compliance for the product itself | Do not invent legal terms, claim MidSizedClinic has signed a BAA in this repo, or quote pricing |
| **Our extra constraints** | Even with a compliant AI product, we still keep likely PHI paths **out of the agent feed** via `.cursorignore` so patient-shaped fixtures and secrets never become context for Tab/Agent/@-mention | Do not claim `.cursorignore` is “HIPAA certification” or that synthetic test files are real PHI |

Honesty from this repo’s `.cursorignore` comments: fixtures are **synthetic** HL7
examples that sit where real patient extracts would live — the patterns are the
point. Say that plainly.

**Boundary vs index:** `.cursorignore` = access block (agent must not see).
`.cursorindexingignore` = search noise only (files stay readable). Never conflate them.

## Design Principle

Use the Canvas format already established for MidSizedClinic (why-this-repo frame,
three-card problem, visual tree for layers, data table + chart, multi-role grid,
account callout). That layout communicated without narration — replicate that clarity.

Full component recipe: [layout-spec.md](layout-spec.md). Read it before writing the Canvas.

## Workflow (every invocation — live, never reuse a stale story)

Copy this checklist and track it:

```
Presentation:
- [ ] 1. Discover kit files (+ MCP config)
- [ ] 2. Extract metadata (count Y vs Z)
- [ ] 3. Map into the five arc buckets (+ why-FHIR / BAA+PHI frame)
- [ ] 4. Load measurements (real or defaults)
- [ ] 5. Write/overwrite the Canvas in plain English
- [ ] 6. Narrate X/Y/Z + why FHIR first + BAA/PHI + MCP + link the Canvas
```

### 1. Discover kit files

From the **repo root**, gather the inventory with Glob / Read (do not hardcode today's file list):

| Class | Globs / paths |
|-------|----------------|
| Boundary | `.cursorignore`, `.cursorindexingignore` |
| Rules | `.cursor/rules/**/*.mdc` |
| Skills | `.cursor/skills/**/SKILL.md` |
| MCP | `.cursor/mcp.json` (and `.vscode/mcp.json` only if `.cursor/mcp.json` is absent) |

Include this skill in the skill count — self-inclusion is the proof.

Skip skill *supporting* files (scripts, yaml, json) except when loading measurements
defaults or when a skill's body is scanned for MCP usage (step 2). They are not
narrative tree nodes by themselves.

### 2. Extract metadata (real shapes in this repo)

**Skills (`SKILL.md`)** — YAML frontmatter between `---` lines:

| Field | Use |
|-------|-----|
| `name` | Door id / pill label |
| `description` | Card body (truncate to one sentence for the grid) |
| `disable-model-invocation` | Optional; ignore for the story |

If frontmatter missing: `name` = parent folder name; `description` = first non-empty `#` heading or first paragraph; mark **inferred**.

Also scan each skill body for MCP usage (case-insensitive). Record `usesMcp: string[]`
server ids when any of these hit:

- Mentions a key from `mcpServers` in the discovered MCP config (e.g. `github`, `ado_microsofthealthoss`)
- Mentions `GitHub MCP`, `GetMcpTools`, `CallMcpTool`, or `mcp.json`
- Links to `.cursor/mcp.json` or an `upstream-sources.json` / verify-*-mcp script

If a skill mentions MCP generically but no server id matches config, set
`usesMcp: ["(unspecified)"]` and mark that mapping **inferred**.

**Rules (`*.mdc`)** — YAML frontmatter:

| Field | Use |
|-------|-----|
| `description` | Rule one-liner |
| `globs` | Scope hint |
| `alwaysApply` | Pill: always vs path-scoped |

If frontmatter missing: `description` from first `#` heading or filename stem; mark **inferred**.

**Boundary files** — no frontmatter. Metadata is the leading `#` comment block before the first pattern line:

- Purpose = first contiguous comment block (compress to ≤2 sentences, plain English)
- Signal = count of non-empty, non-`#` pattern lines
- Distinguish the two files: `.cursorignore` = access boundary; `.cursorindexingignore` = index noise only (files stay readable)

If comments are absent: purpose = filename-based guess; mark **inferred**.

**MCP config (`mcp.json`)** — JSON object under `mcpServers`:

| Field | Use |
|-------|-----|
| Server key | Display name / id (e.g. `github`) |
| `url` vs `command` | Transport: remote URL vs local stdio command |
| `headers` / `args` | Capability hint only — **never** embed secrets, tokens, or `${env:...}` values in the Canvas |
| `X-MCP-Toolsets` / `X-MCP-Readonly` | Show toolsets + readonly flag when present |

If `.cursor/mcp.json` is missing: MCP layer = empty ("none configured"); do not invent servers.
If present but unreadable/invalid JSON: mark **inferred**, show path only.

Optional live check (does not block Canvas): `GetMcpTools` with pattern matching a
configured server id. If a server is ready in the agent catalog, note `status: ready`
in the embedded snapshot; if absent, `status: configured` (file-only — not fabricated as online).

### 3. Map into the arc

| Arc section | Source |
|-------------|--------|
| Title frame | Why FHIR/this repo first + Cursor BAA awareness + PHI feed constraints |
| Problem | Fixed three themes (ramp / conventions / review) in plain English — may cite "0 rules yet" |
| Solution tree | boundary → rules → skills → MCP; boundary copy must explain PHI-out-of-feed |
| Measurements | See step 4 |
| Entry points | Show **all** doors (discovered skills + known Planned gaps). Tag each with audience: `QA` · `Engineering` · `PO` · `DevOps` (see layout-spec mapping). MCP pills when `usesMcp` is non-empty |
| Account value | Land = boundary + BAA/PHI story; Expand = skills/rules/MCP; Retain = kit survives the champion |

### 4. Measurements

1. If `.cursor/eval/convention-scores.json` exists, use it (same shape as defaults).
2. Else use [measurements.defaults.json](measurements.defaults.json) and keep the illustrative caption.

Compute per run: `aggregate = mean(scores)`, `delta = aggregate - baselineAggregate`.

### 5. Write the Canvas

- Path and layout: [layout-spec.md](layout-spec.md)
- Embed the inventory snapshot as constants in the `.canvas.tsx` (no network) — include
  `mcp.servers[]` and each skill's `usesMcp`
- Fix Canvas TypeScript check errors before finishing (`Card` has no `key` prop — wrap in `<div key=...>`; `BarChart` has no `title` — use `H3` above it)
- Read the canvas skill if unsure about `cursor/canvas` APIs
- **Never** put PATs, Authorization headers, or env-var values into the Canvas

### 6. Narrate the tradeoff (required in chat)

Say exactly this pattern with real integers filled in:

> Found X files, Y had metadata, Z were inferred — here's the story anyway.

Then 2–3 short plain-English sentences covering: why this FHIR repo first; Cursor BAA
awareness plus our PHI boundary (not the same thing); MCP server count + which skills wire them.

Then link the Canvas with a markdown link to its absolute `.canvas.tsx` path. One sentence: open it beside the chat for the live demo.

## Key Constraints

- **LIVE** — re-discover and regenerate on every trigger; never present screenshots or a memorized file list as current truth
- **Self-documenting proof** — auto-discovery is the whole point; the Canvas must reflect files that exist *now*
- **Arc fit** — five sections only; why-FHIR / BAA+PHI live in title frame + Problem/Solution/Land wording
- **One Canvas** — overwrite the same output path; no multi-page deck
- **No secrets** — MCP discovery is structural (names, transport kind, toolsets, skill wiring)
- **No overclaim** — BAA is product/compliance posture; `.cursorignore` is our feed constraint

## Anti-patterns

- Static slides, Mermaid-only dumps, or markdown tables in chat instead of a Canvas
- Padding with AGENTS.md / CONTRIBUTING.md tours (out of arc)
- Hiding inferred items — show them and increment Z
- Skipping the X/Y/Z sentence
- Creating helper canvases or extra sections for "more skills" or "MCP deep dive"
- Inventing MCP servers not present in `mcp.json`
- Pasting tokens / Authorization header values into the Canvas or chat narration
- Claiming an MCP is "online" without a successful `GetMcpTools` / catalog check this run
- Claiming `.cursorignore` alone = HIPAA compliance or that test fixtures are real patient data
- Jargon-first copy that assumes the interviewer already knows FHIR
