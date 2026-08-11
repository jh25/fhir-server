---
name: local-setup
description: Sets up and runs this FHIR server repo locally on Docker + SQL Server, and resolves the repo's known setup failures. Use when someone asks to build the project, run the server, or start it locally - and automatically whenever any of these errors appear: MSB5028 (solution filter references a project not in the solution), MSB4044 - The "GetAssemblyVersion" task was not given a value for the required parameter "NuGetVersion", "Value can not be null. (Parameter 'Authority')", or "A compatible .NET SDK was not found".
disable-model-invocation: false
---

# Local setup

Everything below was reproduced against this repo on a live `docker compose up` (image build, container start, `curl http://localhost:8080/metadata` -> 200, `docker compose stop`) before being written down, not inferred from reading code. Three of the five steps exist only to route around defects in this repo's own tooling, not .NET or Docker in general - `scripts/verify.sh` re-checks all three so this file can tell you when Microsoft has fixed one upstream.

Run `scripts/setup.sh` for the full flow, or follow the steps by hand.

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

## 4. Build args the image needs

```bash
export SAPASSWORD=L0cal-Dev-Pwd1   # must satisfy SQL Server's complexity rules
docker compose -f samples/docker/docker-compose.yaml -f .cursor/skills/local-setup/docker-compose.local.yaml up -d --build
```

CI supplies `ASSEMBLY_VER` from GitVersion; locally it's empty, and `dotnet publish` dies with MSB4044: `The "GetAssemblyVersion" task was not given a value for the required parameter "NuGetVersion".` That's a stock .NET SDK target (`Microsoft.NET.GenerateAssemblyInfo.targets`) reacting to an empty `Version`/`AssemblyVersion`, not something specific to this repo - it'll happen to any project built this way. `docker-compose.local.yaml` pins `ASSEMBLY_VER=1.0.0` so this never comes up.

## 5. Verify and tear down

```bash
curl http://localhost:8080/metadata   # expect 200, usually within ~30s of container start
docker compose -f samples/docker/docker-compose.yaml -f .cursor/skills/local-setup/docker-compose.local.yaml stop
```

Use `stop`, never `down`. The `sql` service has no volume, so `down` deletes the container and the database with it; `stop` leaves both in place for next time.

## Scripts

- `scripts/setup.sh` runs steps 2-5. Idempotent - `docker compose up -d --build` reuses containers whose config hasn't changed. Checks for `dotnet` and a running Docker daemon first and exits with a clear message if either is missing, rather than failing partway through a build.
- `scripts/verify.sh` curls `/metadata`, then re-runs the three checks above (`R4.slnf` build, empty-`ASSEMBLY_VER` publish, the `Authority` null-check in `SecurityProvider.cs`) and says plainly which workaround - if any - has been fixed upstream and can be deleted from this skill.
