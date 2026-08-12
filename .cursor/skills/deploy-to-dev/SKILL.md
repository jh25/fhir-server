---
name: deploy-to-dev
description: >-
  Deploys MidSizedClinic "Dev" via CI/CD to the post-demo Fast Healthcare
  Interoperability Resources (FHIR) Docker stack (post-demo-fhir-api on :8081),
  without replacing pre-demo local-setup on :8080. Always ask main vs
  post-change first. Use when the user says Deploy to Dev, /deploy-to-dev, run
  the CI deploy, promote to local, or wants .github/workflows/deploy-to-dev.yml.
disable-model-invocation: false
---

# Deploy to Dev

**Dev** is **local**. Pipeline:
[`.github/workflows/deploy-to-dev.yml`](../../../.github/workflows/deploy-to-dev.yml)
— **Tests** and **Deploy** in parallel. Deploy targets the **post-demo** stack only.

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

| Stack | Skill | Containers | FHIR | SQL |
|-------|-------|------------|------|-----|
| **pre-demo** | [local-setup](../local-setup/SKILL.md) / [local-teardown](../local-teardown/SKILL.md) | `pre-demo-fhir-api`, `pre-demo-sql` | `:8080` | `:1433` |
| **post-demo** | this skill (Deploy to Dev) | `post-demo-fhir-api`, `post-demo-sql` | `:8081` | `:1434` |

`docker ps` names make pre vs post obvious. **local-teardown removes pre-demo only.**

To point the Express demo at either stack: [switch-app-to-local](../switch-app-to-local/SKILL.md) /
[switch-app-to-dev](../switch-app-to-dev/SKILL.md) (smart SQL vs FHIR).

## Interactive prompt (required — ask before deploying)

**Always ask first.** Do not start Docker, checkout, or CI until the user answers.
Same choices as the GitHub Actions dropdown:

```
Which branch to deploy to post-demo?
1. main
2. post-change
```

| Choice | Meaning |
|--------|---------|
| `main` | Stable / pre+post overlays on main |
| `post-change` | Demo “after” branch (create it if missing — do not invent commits) |

Accept `1`/`2`, `main`, or `post-change`. If `post-change` does not exist locally or on `origin`, **stop** and tell the user to create/push it — do not invent the branch.

Optional follow-up only if unclear: **Local Path B** (leave post-demo up on this machine) vs **CI Path A** (Actions run; runner tears down). Default: **Path B**.

## Path B — Local parity (default; leave post-demo up)

After the branch is chosen:

1. Stash or warn if the working tree is dirty and checkout would lose work.
2. `git fetch origin` (if needed) then `git checkout <main|post-change>` (track `origin/<branch>` when present).
3. Deploy from that working tree:

```bash
bash .cursor/skills/deploy-to-dev/scripts/deploy-local-parity.sh
```

```bash
export SAPASSWORD=L0cal-Dev-Pwd1
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml \
  up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/metadata
```

Expect **200** on `http://localhost:8081/metadata`. Do not tear down pre-demo.

Tear down **post-demo** only when asked:

```bash
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml \
  down
```

## Path A — CI (optional)

Auto-runs on **push/PR to `main`**. Manual run uses the same branch choice:

```bash
# Actions UI: Actions → Deploy to Dev → Run workflow → main | post-change
gh workflow run deploy-to-dev.yml -f ref=<main|post-change>
gh run list --workflow=deploy-to-dev.yml --limit 5
gh run watch
```

| Job | Role |
|-----|------|
| Tests | ImagingStudy MTP gate (exit 5/8 OK if none) |
| Deploy | `post-demo` → `/metadata` on `:8081` → `down -v` (CI runner tears down) |

## Forbidden

| Do not | Why |
|--------|-----|
| Skip the branch prompt | Demo needs an explicit main vs post-change choice |
| Use local-teardown for post-demo | Wrong project — removes pre-demo |
| Expect Deploy on `:8080` | post-demo is `:8081` |
| Duplicate a second deploy workflow | One pipeline: `deploy-to-dev.yml` |
| Create `post-change` with fake history | User creates that branch when ready |

## Related

- Overlay: [docker-compose.deploy.yaml](docker-compose.deploy.yaml) (`name: post-demo`)
- Workflow: [deploy-to-dev.yml](../../../.github/workflows/deploy-to-dev.yml) (`workflow_dispatch` choices: `main`, `post-change`)
- pre-demo: [local-setup](../local-setup/SKILL.md)
