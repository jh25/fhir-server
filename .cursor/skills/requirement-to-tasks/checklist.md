# Requirement → tasks — step card

Companion to [SKILL.md](SKILL.md).

## Prompts

1. Requirement?
2. Primary audience? (PM / eng / QA / all)
3. Version? (R4 default)
4. Scope? (server · demo · both · discovery)

Do **not** ask for constraints — FHIR-00/01/02, FHIR-10–13, Design indicator honesty, and no hard-delete of `dbo.Resource` always apply (see SKILL standing constraints + SDLC gates).

## Dual restatement

- **Clinic:** …
- **Tech:** …

## Task card (copy per task)

```markdown
### T-{n}: {title}
| Owner | Depends on | Clinic outcome | Tech outcome |
|-------|------------|----------------|--------------|
| … | … | … | … |

**Dev steps:** 1. … 2. …

**QA automation (peer):**
| Unit | E2E | Integration | Smoke |
|------|-----|-------------|-------|
| … | … | … | … |

**Skills / patterns:** …
**Done when:** …
```

## Skill map (short)

| Need | Skill |
|------|-------|
| Wire ImagingStudy | add-fhir-resource-type |
| Undo wiring | remove-fhir-resource-type |
| Run / stop local | local-setup / local-teardown |
| PR quality | pre-review-patterns · strengthen-tests |
| Demo SQL→FHIR | demo-app + `#design-indicator` |

## SDLC gates

FHIR-00 · FHIR-01 · FHIR-02 · pre-review · strengthen-tests · smoke · Design indicator matches path
