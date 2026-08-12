---
name: deploy-to-dev
description: >-
  Deploys MidSizedClinic "Dev" via the Deploy to Dev CI/CD pipeline to a
  side-by-side Fast Healthcare Interoperability Resources (FHIR) Docker stack
  (compose project midsizedclinic-deploy on :8081), without replacing local-setup
  on :8080. Use when the user says Deploy to Dev, /deploy-to-dev, run the CI
  deploy, promote to local, or wants the same path as
  .github/workflows/deploy-to-dev.yml.
disable-model-invocation: false
---

# Deploy to Dev

**Dev** for MidSizedClinic is **local** — not a cloud environment. The CI/CD
pipeline is
[`.github/workflows/deploy-to-dev.yml`](../../../.github/workflows/deploy-to-dev.yml)
(**Deploy to Dev**): **Tests** and **Deploy** run **in parallel**. Deploy uses a
**separate compose project** so it does not replace the engineer local-setup stack.

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

| Stack | Compose project | FHIR | SQL (host) | Purpose |
|-------|-----------------|------|------------|---------|
| local-setup | `docker` (from `samples/docker`) | `:8080` | `:1433` | Day-to-day coding + demo |
| **Deploy to Dev** | `midsizedclinic-deploy` | `:8081` | `:1434` | Pipeline / smoke; can run alongside local-setup |

| This skill | [local-setup](../local-setup/SKILL.md) |
|------------|----------------------------------------|
| Side-by-side deploy stack + CI gate | Engineer workstation stack + demo `:3000` |
| CI downs deploy stack after smoke; local parity **leaves deploy stack up** | Leaves local-setup up |

Tear down **local-setup** with [local-teardown](../local-teardown/SKILL.md). Tear down
**deploy stack** with the compose command in Path B (not local-teardown).

## What “Dev” (deploy stack) is

| Piece | Value |
|-------|--------|
| FHIR API | `http://localhost:8081` |
| Smoke | `GET /metadata` → **200** |
| Compose | `samples/docker/docker-compose.yaml` + `local-setup/docker-compose.local.yaml` + [`docker-compose.deploy.yaml`](docker-compose.deploy.yaml) |
| SQL password (compose) | `SAPASSWORD=L0cal-Dev-Pwd1` (complexity rules; not a real secret) |
| Required check name (branch protection) | **Deploy** |

Demo app (`:3000`) stays on local-setup SQL `:1433`. Deploy stack is smoke-only unless you point tools at `:1434` / `:8081` on purpose.

## Choose a path

```
Deploy to Dev
├─ A. CI/CD (canonical)     → push/PR to main → watch deploy-to-dev.yml
└─ B. Local parity          → midsizedclinic-deploy on :8081; local-setup untouched
```

**Agent note (Windows):** Prefer `bash` for local scripts (Git Bash). Use `gh` with `GH_TOKEN` / `GITHUB_PERSONAL_ACCESS_TOKEN` when monitoring Actions.

---

## Path A — CI/CD (canonical Deploy to Dev)

1. Confirm `.github/workflows/deploy-to-dev.yml` is on the remote branch.
2. Push / open PR to `main`.
3. Monitor:

```bash
gh run list --workflow=deploy-to-dev.yml --limit 5
gh run watch
```

| Job `name` | Role |
|------------|------|
| Tests | Parallel gate: MTP `--treenode-filter "*ImagingStudy*"` (exit 5/8 OK if none) |
| Deploy | Parallel: project `midsizedclinic-deploy` → `/metadata` on `:8081` → `down -v` |

Do **not** log PHI.

---

## Path B — Local parity (side-by-side, keep deploy stack up)

```bash
bash .cursor/skills/deploy-to-dev/scripts/deploy-local-parity.sh
```

| Flag | Effect |
|------|--------|
| (none) | Compose up `--build` + `/metadata` on `:8081` |
| `--with-tests` | Run Tests gate first |
| `--skip-build` | Compose `up -d` without `--build` |

Or by hand:

```bash
export SAPASSWORD=L0cal-Dev-Pwd1
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-setup/docker-compose.local.yaml \
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml \
  up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/metadata
```

Tear down **only** the deploy stack:

```bash
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-setup/docker-compose.local.yaml \
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml \
  down
```

## Checklist

```
Deploy to Dev
- [ ] Path chosen (A CI or B local)
- [ ] Uses docker-compose.deploy.yaml (project midsizedclinic-deploy), not demo :1433 overlay alone
- [ ] Smoke on :8081 (not :8080)
- [ ] local-setup on :8080 left alone
- [ ] No PHI in logs
```

## Forbidden

| Do not | Why |
|--------|-----|
| Deploy with only local-setup + demo overlays | Replaces / fights `:8080`/`:1433` |
| Point demo app at `:1434` without intending to | Wrong SQL for day-to-day local-setup |
| `local-teardown` for the deploy project | Tears down the wrong compose project |
| Duplicate a second deploy workflow | One pipeline: `deploy-to-dev.yml` |

## Related

- Workflow: [`.github/workflows/deploy-to-dev.yml`](../../../.github/workflows/deploy-to-dev.yml)
- Overlay: [docker-compose.deploy.yaml](docker-compose.deploy.yaml)
- Workstation stack: [local-setup](../local-setup/SKILL.md)
- Stop workstation stack: [local-teardown](../local-teardown/SKILL.md)
