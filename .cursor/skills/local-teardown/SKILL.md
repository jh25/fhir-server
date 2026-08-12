---
name: local-teardown
description: >-
  Tears down the local Fast Healthcare Interoperability Resources (FHIR) server
  Docker environment and stops the MidSizedClinic imaging demo app (Express on
  :3000) cleanly. Use when someone asks to tear down, clean up, stop the server,
  stop the demo app, or remove the environment — and automatically when any of
  these show up, since they all mean the environment is in a stuck or confusing
  state: "pre-demo-fhir-api" appearing in logs (containers are still up),
  "already in use" (a port conflict - something, usually Kestrel, can't bind
  because the containers already hold it), or "Connection refused" (something
  tried to reach the server and found nothing there).
disable-model-invocation: false
---

# Local teardown

Companion to `local-setup` for the MidSizedClinic Fast Healthcare Interoperability
Resources (FHIR) **pre-demo** stack (`pre-demo-fhir-api` / `pre-demo-sql` on
`:8080` / `:1433`). Does **not** remove Deploy to Dev **post-demo**
(`post-demo-fhir-api` on `:8081`). Run `scripts/teardown.sh`, or do it by hand.

**Always stop the MidSizedClinic demo app first**, then stop (or down) Docker. That frees port **3000** and avoids a stray `node` process after containers halt.

**Agent note (Windows):** Prefer `bash .cursor/skills/local-teardown/scripts/teardown.sh` from the repo root. Do **not** pass `--down` unless the user asks — default `stop` keeps SQL seed data.

## 0. Stop the imaging demo app

```bash
bash .cursor/skills/local-teardown/scripts/stop-demo-app.sh
```

Or by hand (PowerShell):

```powershell
# PID file from local-setup start-demo-app.sh
$pidFile = "midsizedclinic-demo-app/.demo-app.pid"
if (Test-Path $pidFile) {
  $p = Get-Content $pidFile | Select-Object -First 1
  if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

Confirm nothing on 3000: `curl http://localhost:3000/health` should fail / connection refused.

## Default: stop Docker

```bash
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-teardown/docker-compose.local.yaml \
  -f midsizedclinic-demo-app/docker-compose.demo.yaml \
  stop
```

Halts both **pre-demo** containers, keeps them and the SQL data (including demo seed ImagingStudy rows) intact. This is the default because it's reversible - `docker compose start` or local-setup picks up where you left off. Compose project name is **`pre-demo`** (from `docker-compose.local.yaml`), so containers are `pre-demo-fhir-api` / `pre-demo-sql` — not the Deploy to Dev `post-demo-*` stack.

## Optional: down

```bash
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-teardown/docker-compose.local.yaml \
  -f midsizedclinic-demo-app/docker-compose.demo.yaml \
  down
```

Removes the containers and network entirely. The `sql` service has no volume, so this also **deletes the database and demo seed data** - there's nothing to pick back up next time; `local-setup` has to build, initialize, and re-seed from scratch. Only run this if you're told to, or if `stop` isn't enough (e.g. a stale container is holding a port a rebuild needs). Say what you're about to destroy before you run it.

## Confirming it worked

```bash
docker ps --filter "name=pre-demo-fhir-api" --filter "name=pre-demo-sql"
```

Empty output means Docker services are not running. `docker ps` only lists running containers, so this reads the same after `stop` and after `down` - use `docker ps -a` if you need to tell those two apart (existing-but-stopped vs. actually removed).

Also confirm the demo app is down (nothing listening on **3000**).

## Scripts

`scripts/teardown.sh` — stops the demo app (`stop-demo-app.sh`), then runs compose `stop` (default) or `down` (`--down`). Reports Docker containers before/after. Ask before passing `--down` on someone's behalf.

`scripts/stop-demo-app.sh` — kills `.demo-app.pid` if present, then falls back to whatever is listening on port 3000 (PowerShell on Windows / `lsof` elsewhere).
