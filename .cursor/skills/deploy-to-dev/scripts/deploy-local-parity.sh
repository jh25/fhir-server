#!/usr/bin/env bash
# Local parity for Deploy to Dev (.github/workflows/deploy-to-dev.yml).
# Compose up + GET /metadata — leaves the stack running (unlike CI's down -v).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
cd "$repo_root"

with_tests=0
skip_build=0
for arg in "$@"; do
  case "$arg" in
    --with-tests) with_tests=1 ;;
    --skip-build) skip_build=1 ;;
    -h|--help)
      echo "Usage: deploy-local-parity.sh [--with-tests] [--skip-build]"
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker CLI not found on PATH." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon not responding. Start Docker Desktop and re-run." >&2
  exit 1
fi

export SAPASSWORD="${SAPASSWORD:-L0cal-Dev-Pwd1}"

compose=(
  docker compose
  -f samples/docker/docker-compose.yaml
  -f .cursor/skills/local-setup/docker-compose.local.yaml
  -f midsizedclinic-demo-app/docker-compose.demo.yaml
)

if [[ "$with_tests" -eq 1 ]]; then
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "ERROR: dotnet CLI not found (required for --with-tests)." >&2
    exit 1
  fi
  echo "== Tests gate (MTP *ImagingStudy*; same as CI Deploy to Dev) =="
  # Directory.Build.props enables Microsoft Testing Platform — use args after --.
  # Exit 5 = zero matches (OK until ImagingStudy tests are wired).
  dotnet test \
    src/Microsoft.Health.Fhir.R4.Core.UnitTests/Microsoft.Health.Fhir.R4.Core.UnitTests.csproj \
    --configuration Release \
    -- \
    --treenode-filter "*ImagingStudy*" \
    --ignore-exit-code "5;8"
  dotnet test \
    test/Microsoft.Health.Fhir.R4.Tests.E2E/Microsoft.Health.Fhir.R4.Tests.E2E.csproj \
    --configuration Release \
    -- \
    --treenode-filter "*ImagingStudy*" \
    --ignore-exit-code "5;8"
fi

echo "== Docker Compose up (local-setup equivalent; leave running) =="
if [[ "$skip_build" -eq 1 ]]; then
  "${compose[@]}" up -d
else
  "${compose[@]}" up -d --build
fi

echo "== Smoke: GET http://localhost:8080/metadata =="
ok=0
for i in $(seq 1 60); do
  code="$(curl -s -o /tmp/fhir-metadata-deploy-dev.json -w "%{http_code}" http://localhost:8080/metadata || true)"
  if [[ "$code" == "200" ]]; then
    echo "metadata OK (attempt $i)"
    ok=1
    break
  fi
  echo "attempt $i: HTTP ${code:-none} — retry in 5s"
  sleep 5
done

if [[ "$ok" -ne 1 ]]; then
  echo "ERROR: /metadata did not return 200 within ~5 minutes" >&2
  "${compose[@]}" ps || true
  "${compose[@]}" logs --tail=80 fhir-api || true
  exit 1
fi

echo
echo "Deploy to Dev (local parity) succeeded."
echo "FHIR: http://localhost:8080/metadata"
echo "Tear down later with local-teardown (do not down -v unless you intend to wipe SQL)."
