---
name: deploy-to-dev
description: >-
  Deploys MidSizedClinic "Dev" via CI/CD to the post-demo Fast Healthcare
  Interoperability Resources (FHIR) Docker stack (post-demo-fhir-api on :8081),
  without replacing pre-demo local-setup on :8080. Use when the user says Deploy
  to Dev, /deploy-to-dev, run the CI deploy, promote to local, or wants
  .github/workflows/deploy-to-dev.yml.
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

## Path A — CI

```bash
gh run list --workflow=deploy-to-dev.yml --limit 5
gh run watch
```

| Job | Role |
|-----|------|
| Tests | ImagingStudy MTP gate (exit 5/8 OK if none) |
| Deploy | `post-demo` → `/metadata` on `:8081` → `down -v` |

## Path B — Local parity (leave post-demo up)

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

Tear down **post-demo** only:

```bash
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml \
  down
```

## Forbidden

| Do not | Why |
|--------|-----|
| Use local-teardown for post-demo | Wrong project — removes pre-demo |
| Expect Deploy on `:8080` | post-demo is `:8081` |
| Duplicate a second deploy workflow | One pipeline: `deploy-to-dev.yml` |

## Related

- Overlay: [docker-compose.deploy.yaml](docker-compose.deploy.yaml) (`name: post-demo`)
- pre-demo: [local-setup](../local-setup/SKILL.md)
