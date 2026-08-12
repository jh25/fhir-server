#!/usr/bin/env bash
# Runs steps 2-5 from SKILL.md: build the Web project directly (step 2), then bring up
# the Docker Compose stack with the local overrides that route around this repo's
# Authority and ASSEMBLY_VER defects (steps 3-4), then verify (step 5).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
cd "$repo_root"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "ERROR: dotnet CLI not found on PATH." >&2
  echo "Install the pinned SDK: winget install Microsoft.DotNet.SDK.10" >&2
  exit 1
fi

sdk_version="$(dotnet --version)"
echo "dotnet --version (from repo root, so global.json's 10.0.302 pin applies): $sdk_version"
case "$sdk_version" in
  10.0.3*) ;;
  *)
    echo "WARNING: expected a 10.0.3xx SDK (global.json pins 10.0.302), got $sdk_version." >&2
    echo "A 10.0.4xx install is a different feature band, not just a newer patch, and dotnet may refuse to use it here." >&2
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker CLI not found on PATH. Install Docker Desktop and re-run." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: docker CLI is present but the daemon isn't responding. Start Docker Desktop and re-run." >&2
  exit 1
fi

echo
echo "== step 2: dotnet build src/Microsoft.Health.Fhir.R4.Web (not R4.slnf - see SKILL.md) =="
dotnet build src/Microsoft.Health.Fhir.R4.Web/Microsoft.Health.Fhir.R4.Web.csproj

echo
echo "== steps 3-4: docker compose up with local overrides + demo SQL port 1433 =="
export SAPASSWORD="${SAPASSWORD:-L0cal-Dev-Pwd1}"

demo_compose="$repo_root/midsizedclinic-demo-app/docker-compose.demo.yaml"
compose_args=(-f samples/docker/docker-compose.yaml -f "$skill_dir/docker-compose.local.yaml")
if [[ -f "$demo_compose" ]]; then
  compose_args+=(-f "$demo_compose")
  echo "including $demo_compose (publishes sql:1433 for the Express demo)"
else
  echo "WARNING: $demo_compose missing — host demo app cannot reach SQL on localhost:1433" >&2
fi
docker compose "${compose_args[@]}" up -d --build

echo
echo "== step 5: verify FHIR API =="
"$script_dir/verify.sh"

echo
echo "== step 6: MidSizedClinic imaging demo app (Express on :3000) =="
"$script_dir/start-demo-app.sh"
