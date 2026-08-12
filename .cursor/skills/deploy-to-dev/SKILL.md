---
name: deploy-to-dev
description: >-
  Deploys MidSizedClinic "Dev" via the Deploy to Dev CI/CD pipeline, which
  targets the local Fast Healthcare Interoperability Resources (FHIR) Docker
  stack (compose + GET /metadata smoke). Tests are a gate inside that pipeline,
  not a separate product. Use when the user says Deploy to Dev, /deploy-to-dev,
  run the CI deploy, promote to local, or wants the same path as
  .github/workflows/deploy-to-dev.yml.
disable-model-invocation: false
---

# Deploy to Dev

**Dev** for MidSizedClinic is **local** — not a cloud environment. The CI/CD
pipeline is
[`.github/workflows/deploy-to-dev.yml`](../../../.github/workflows/deploy-to-dev.yml)
(**Deploy to Dev**): **Tests** (gate) → **Deploy** (compose + `/metadata`).

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

| This skill | [local-setup](../local-setup/SKILL.md) |
|------------|----------------------------------------|
| Pipeline-shaped: Tests → Deploy → metadata smoke | Engineer workstation: SDK, compose, demo app `:3000`, seed |
| “Is Dev green?” / merge-blocking deploy proof | “I need FHIR + demo running to code” |
| CI downs the stack after smoke; local parity **leaves Dev up** | Leaves stack + demo up for daily work |

Tear down with [local-teardown](../local-teardown/SKILL.md) when done.

## What “Dev” is

| Piece | Value |
|-------|--------|
| FHIR API | `http://localhost:8080` |
| Smoke | `GET /metadata` → **200** |
| Compose | `samples/docker/docker-compose.yaml` + `.cursor/skills/local-setup/docker-compose.local.yaml` + `midsizedclinic-demo-app/docker-compose.demo.yaml` |
| SQL password (compose) | `SAPASSWORD=L0cal-Dev-Pwd1` (complexity rules; not a real secret) |
| Required check name (branch protection) | **Deploy** |

Demo app (`:3000`) and seed are **out of scope** for Deploy to Dev (CI does not start Express). After Dev is up, use local-setup steps 6+ if the demo is needed.

## Choose a path

```
Deploy to Dev
├─ A. CI/CD (canonical)     → push/PR to main → watch deploy-to-dev.yml
└─ B. Local parity          → same jobs on this machine; leave stack running
```

Default to **A** when the user wants the pipeline / merge gate. Use **B** when they want Dev on this laptop without waiting on Actions, or when CI is unavailable.

**Agent note (Windows):** Prefer `bash` for local scripts (Git Bash). Use `gh` with `GH_TOKEN` / `GITHUB_PERSONAL_ACCESS_TOKEN` when monitoring Actions.

---

## Path A — CI/CD (canonical Deploy to Dev)

1. Confirm workflow file exists and is on the remote branch that will run Actions:
   `.github/workflows/deploy-to-dev.yml`
2. Ensure changes (and any compose overlays the workflow mounts) are committed and pushed.
3. Trigger:
   - **pull_request** targeting `main`, or
   - **push** to `main`
4. Monitor (repo `jh25/fhir-server` or current `origin`):

```bash
gh run list --workflow=deploy-to-dev.yml --limit 5
gh run watch   # or: gh run view <id> --log-failed
```

Jobs (tests are part of deploy, not a separate product):

| Job `name` | Role |
|------------|------|
| Tests | Gate: MTP `--treenode-filter "*ImagingStudy*"` on R4 unit + E2E (exit 5 / zero matches allowed until tests are wired) |
| Deploy | Compose up → `/metadata` → compose `down -v` (ephemeral runner) |

5. Report Pass/Fail with the run URL. Do **not** log PHI; metadata JSON snippets are fine (CapabilityStatement, not patient data).

If CI fails on Deploy, pull `fhir-api` logs from the failed job; compare compose file paths to local-setup. Fix and re-push — do not invent a second workflow.

---

## Path B — Local parity (same pipeline, keep Dev up)

Mirrors CI **except** the final `down -v` — leave containers running so Dev stays available.

```bash
bash .cursor/skills/deploy-to-dev/scripts/deploy-local-parity.sh
```

Flags:

| Flag | Effect |
|------|--------|
| (none) | Compose up `--build` + `/metadata` smoke (default) |
| `--with-tests` | Run the Tests gate first (full pipeline shape) |
| `--skip-build` | Compose `up -d` without `--build` |

Or by hand:

```bash
export SAPASSWORD=L0cal-Dev-Pwd1
# optional: Tests gate (Microsoft Testing Platform — not VSTest --filter)
dotnet test src/Microsoft.Health.Fhir.R4.Core.UnitTests/Microsoft.Health.Fhir.R4.Core.UnitTests.csproj \
  --configuration Release -- --treenode-filter "*ImagingStudy*" --ignore-exit-code 5
dotnet test test/Microsoft.Health.Fhir.R4.Tests.E2E/Microsoft.Health.Fhir.R4.Tests.E2E.csproj \
  --configuration Release -- --treenode-filter "*ImagingStudy*" --ignore-exit-code 5

docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-setup/docker-compose.local.yaml \
  -f midsizedclinic-demo-app/docker-compose.demo.yaml \
  up -d --build

# smoke — expect 200 within ~5 minutes
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/metadata
```

PowerShell smoke:

```powershell
$env:SAPASSWORD = "L0cal-Dev-Pwd1"
# … same docker compose up …
(Invoke-WebRequest http://localhost:8080/metadata -UseBasicParsing).StatusCode  # 200
```

**Do not** run compose `down -v` as part of Deploy to Dev locally unless the user asks to tear down (then use local-teardown).

---

## Checklist

```
Deploy to Dev
- [ ] Path chosen (A CI or B local)
- [ ] deploy-to-dev.yml is the source of truth for steps
- [ ] Tests gate green (CI job or --with-tests)
- [ ] Compose uses the three MidSizedClinic files (not samples alone)
- [ ] GET http://localhost:8080/metadata → 200 (local) OR Deploy job green (CI)
- [ ] No PHI in logs or agent output
- [ ] If demo needed next → hand off to local-setup (not this skill)
```

## Forbidden

| Do not | Why |
|--------|-----|
| Treat Dev as Azure/prod | Dev = local Docker only in this kit |
| Skip the Tests job when claiming full CI Deploy to Dev | Pipeline order is Tests → Deploy |
| `docker compose down -v` after a successful local deploy | Wipes the Dev you just stood up |
| Start from `samples/docker` alone | Missing Authority / ASSEMBLY_VER / SQL :1433 overlays |
| Duplicate a second deploy workflow | One pipeline: `deploy-to-dev.yml` |

## Related

- Workflow: [`.github/workflows/deploy-to-dev.yml`](../../../.github/workflows/deploy-to-dev.yml)
- Workstation full stack: [local-setup](../local-setup/SKILL.md)
- Stop Dev: [local-teardown](../local-teardown/SKILL.md)
- ImagingStudy wiring that feeds the Tests filter: [add-fhir-resource-type](../add-fhir-resource-type/SKILL.md)
