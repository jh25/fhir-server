---
name: local-teardown
description: Tears down the local FHIR server Docker environment cleanly. Use when someone asks to tear down, clean up, stop the server, or remove the environment - and automatically when any of these show up, since they all mean the environment is in a stuck or confusing state: "docker-fhir-api-1" appearing in logs (containers are still up), "already in use" (a port conflict - something, usually Kestrel, can't bind because the containers already hold it), or "Connection refused" (something tried to reach the server and found nothing there).
disable-model-invocation: false
---

# Local teardown

Companion to `local-setup`. Run `scripts/teardown.sh`, or do it by hand.

## Default: stop

```bash
docker compose -f samples/docker/docker-compose.yaml -f .cursor/skills/local-teardown/docker-compose.local.yaml stop
```

Halts both containers, keeps them and the SQL data intact. This is the default because it's reversible - `docker compose start` picks up exactly where you left off. The override file lives in this skill folder rather than `local-setup`'s, but that's cosmetic: Compose derives the project name from the *first* `-f` file's directory (`samples/docker`), so this targets the same `docker-fhir-api-1` / `docker-sql-1` containers regardless of which skill folder's override rides along - confirmed by bringing the stack up via `local-setup`'s override and tearing it down via this one.

## Optional: down

```bash
docker compose -f samples/docker/docker-compose.yaml -f .cursor/skills/local-teardown/docker-compose.local.yaml down
```

Removes the containers and network entirely. The `sql` service has no volume, so this also deletes the database - there's nothing to pick back up next time, `local-setup` has to build and initialize from scratch. Only run this if you're told to, or if `stop` isn't enough (e.g. a stale container is holding a port a rebuild needs). Say what you're about to destroy before you run it.

## Confirming it worked

```bash
docker ps --filter "name=docker-fhir-api" --filter "name=docker-sql"
```

Empty output means gone. `docker ps` only lists running containers, so this reads the same after `stop` and after `down` - use `docker ps -a` if you need to tell those two apart (existing-but-stopped vs. actually removed).

## Scripts

`scripts/teardown.sh` reports what's running before it does anything, runs `stop`, reports what's running after, and explains the `stop`/`down` distinction above. It only runs `down` if invoked with `--down`; ask before passing that flag on someone's behalf.
