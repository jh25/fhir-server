---
name: local-setup
description: >-
  Sets up and runs this Fast Healthcare Interoperability Resources (FHIR) server
  repo locally on Docker + SQL Server, publishes SQL :1433, launches the
  MidSizedClinic imaging demo app (Express on :3000), seeds demo ImagingStudy
  data, and resolves known setup failures. Use when someone asks to build the
  project, run the server, start it locally, or run the imaging demo — and
  automatically whenever any of these errors appear: MSB5028 (solution filter
  references a project not in the solution), MSB4044 - The "GetAssemblyVersion"
  task was not given a value for the required parameter "NuGetVersion",
  "Value can not be null. (Parameter 'Authority')", or "A compatible .NET SDK was
  not found".
disable-model-invocation: false
---

# Local setup

Sets up the MidSizedClinic Fast Healthcare Interoperability Resources (FHIR)
server locally. Everything below was reproduced against this repo on a live
`docker compose up` (image build, container start,
`curl http://localhost:8080/metadata` -> 200, `docker compose stop`) before being
written down, not inferred from reading code. Three of the five Docker steps
exist only to route around defects in this repo's own tooling, not .NET or
Docker in general - `scripts/verify.sh` re-checks all three so this file can
tell you when Microsoft has fixed one upstream.

Run `scripts/setup.sh` for the full flow (FHIR + SQL + MidSizedClinic demo app), or follow the steps by hand.

**Agent note (Windows):** Prefer `bash .cursor/skills/local-setup/scripts/setup.sh` from the repo root (Git Bash). If bash is unavailable, run the PowerShell equivalents in each step below. After setup, leave the demo app running in the background (`npm start` / PID in `midsizedclinic-demo-app/.demo-app.pid`).

## 1. SDK version

`global.json` pins `10.0.302`. `dotnet --version` only reflects it when run from the repo root - global.json is directory-scoped, so the same command elsewhere on the machine can report a different SDK.

```bash
winget install Microsoft.DotNet.SDK.10
dotnet --version   # from the repo root; must print 10.0.302
```

If this prints "A compatible .NET SDK was not found", no installed SDK satisfies the 10.0.3xx feature band `global.json` asks for - installing a newer `10.0.4xx` does not fix it, since a feature band is not just a patch bump. Install the exact band above.

## 2. Build the Web project directly, not the .slnf

```bash
dotnet build src/Microsoft.Health.Fhir.R4.Web/Microsoft.Health.Fhir.R4.Web.csproj
```

`dotnet build R4.slnf` fails with MSB5028: both `R4.slnf` and `R5.slnf` reference `test/Microsoft.Health.Fhir.Shared.Tests.Crucible/*.shproj`, which isn't a project in `Microsoft.Health.Fhir.sln`. Building the Web project's own dependency graph sidesteps the filter entirely.

## 3. Authority workaround for local Docker

`samples/docker/docker-compose.yaml` sets `Security:Enabled=false`, but `SecurityProvider`'s constructor (`src/Microsoft.Health.Fhir.Shared.Api/Features/Security/SecurityProvider.cs`, ~line 42) does an unconditional `EnsureArg.IsNotNull` on `Authentication.Authority` regardless of `Enabled`. `BuildAsync` correctly no-ops when security is disabled, so the value is never actually read - it just has to exist to get past the constructor. `docker-compose.local.yaml` in this skill folder sets it to a throwaway value; don't touch anything under `samples/` to fix this.

## 4. Build args + SQL port for the demo app

```bash
export SAPASSWORD=L0cal-Dev-Pwd1   # must satisfy SQL Server's complexity rules
docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-setup/docker-compose.local.yaml \
  -f midsizedclinic-demo-app/docker-compose.demo.yaml \
  up -d --build
```

PowerShell:

```powershell
$env:SAPASSWORD = "L0cal-Dev-Pwd1"
docker compose `
  -f samples/docker/docker-compose.yaml `
  -f .cursor/skills/local-setup/docker-compose.local.yaml `
  -f midsizedclinic-demo-app/docker-compose.demo.yaml `
  up -d --build
```

CI supplies `ASSEMBLY_VER` from GitVersion; locally it's empty, and `dotnet publish` dies with MSB4044: `The "GetAssemblyVersion" task was not given a value for the required parameter "NuGetVersion".` That's a stock .NET SDK target (`Microsoft.NET.GenerateAssemblyInfo.targets`) reacting to an empty `Version`/`AssemblyVersion`, not something specific to this repo - it'll happen to any project built this way. `docker-compose.local.yaml` pins `ASSEMBLY_VER=1.0.0` so this never comes up.

`midsizedclinic-demo-app/docker-compose.demo.yaml` publishes **`1433:1433`** so the host Express demo can reach SQL. Without it, `docker-sql-1` only has container-internal `1433/tcp` and the demo reports `SQL connectivity: down`.

Confirm: `docker ps` shows `0.0.0.0:1433->1433/tcp` on `docker-sql-1`.

## 5. Verify FHIR API

```bash
curl http://localhost:8080/metadata   # expect 200, usually within ~30s of container start
```

Use `stop` (via local-teardown), never `down`, when pausing for the day. The `sql` service has no volume, so `down` deletes the container and the database with it; `stop` leaves both in place for next time.

## 6. Launch MidSizedClinic imaging demo app

After metadata returns 200:

```bash
bash .cursor/skills/local-setup/scripts/start-demo-app.sh
```

Or by hand:

```bash
cd midsizedclinic-demo-app
cp -n .env.example .env   # skip if .env already exists
npm install
npm start                 # leave running — http://localhost:3000
# other terminal:
npm run seed
curl http://localhost:3000/health   # expect {"status":"ok","sql":"up"}
```

PowerShell (agent-friendly background start):

```powershell
cd midsizedclinic-demo-app
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
# Start in background (Cursor: block_until_ms 0), then:
npm run seed
Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
```

`start-demo-app.sh` writes `.demo-app.pid` / `.demo-app.log`, waits for `/health` 200, then runs `npm run seed` (implementation: `midsizedclinic-demo-app/scripts/seed-demo-data.js`).

**Seed data (idempotent):** checks for stable ids and **skips** if all are present. After `docker compose down` (DB wipe), seed runs again. Force upsert: `SEED_FORCE=1 npm run seed`.

| Resource | Id | Notes |
|---|---|---|
| Patient | `pat-1001` | Demo, Alex |
| Patient | `pat-1002` | Other, Blake |
| ImagingStudy | `stu-demo-us-1..3` | US for Alex (different `started`) |
| ImagingStudy | `stu-demo-ct-1` | CT for Alex (modality filter demo) |
| ImagingStudy | `stu-demo-us-other` | US for Blake (compartment demo) |

UI: open **http://localhost:3000/** — Alex/Blake chart tabs, patient typeahead (`GET /api/patients`), modality chips. Role (Technician/Radiologist) is access context only; both **read** the same ImagingStudy list.

Worklist smoke test:

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/Patient/pat-1001/ImagingStudy?_sort=-started" \
  -H "X-User-Role: clinicTechnician" -H "X-User-Id: tech-1204"
curl "http://localhost:3000/Patient/pat-1002/ImagingStudy?_sort=-started" \
  -H "X-User-Role: clinicTechnician" -H "X-User-Id: tech-1204"
```

Expect Alex total ≥ 4 seed studies (more if older manual POSTs remain after `stop`); Blake total ≥ 1 (`stu-demo-us-other`).

## Scripts

- `scripts/setup.sh` — steps 2–6. Idempotent compose up; starts/seeds the demo app. Checks for `dotnet`, Docker daemon, and (via start-demo-app) `node`/`npm`.
- `scripts/start-demo-app.sh` — `.env`, `npm install`, background `npm start`, wait `/health`, `npm run seed` (skip if `stu-demo-*` already exist).
- `scripts/verify.sh` — curls `/metadata`, then re-runs the three upstream-workaround canaries (`R4.slnf` build, empty-`ASSEMBLY_VER` publish, `Authority` null-check in `SecurityProvider.cs`).
