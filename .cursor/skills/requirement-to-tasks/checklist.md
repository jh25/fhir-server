# Requirement → tasks — step card

Companion to [SKILL.md](SKILL.md).

## Prompts

1. Requirement?
2. Primary audience? (PM / eng / QA / all)
3. Version? (R4 default)
4. Scope? (server · demo · both · discovery)
5. Constraints?

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
