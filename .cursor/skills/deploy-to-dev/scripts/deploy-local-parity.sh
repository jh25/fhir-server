#!/usr/bin/env bash
# Local parity for Deploy to Dev — compose project post-demo (:8081/:1434).
# Does NOT replace pre-demo (local-setup on :8080/:1433). Leaves post-demo running.
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
      echo "Deploys post-demo stack (post-demo-fhir-api / post-demo-sql on :8081/:1434)."
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
fhir_port="${FHIR_DEPLOY_PORT:-8081}"

compose=(
  docker compose
  -f samples/docker/docker-compose.yaml
  -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml
)

if [[ "$with_tests" -eq 1 ]]; then
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "ERROR: dotnet CLI not found (required for --with-tests)." >&2
    exit 1
  fi
  echo "== Tests gate (MTP *ImagingStudy*; same as CI Deploy to Dev) =="
  set +e
  dotnet test \
    src/Microsoft.Health.Fhir.R4.Core.UnitTests/Microsoft.Health.Fhir.R4.Core.UnitTests.csproj \
    --configuration Release \
    -- \
    --treenode-filter "*ImagingStudy*" \
    --ignore-exit-code "5;8"
  c1=$?
  dotnet test \
    test/Microsoft.Health.Fhir.R4.Tests.E2E/Microsoft.Health.Fhir.R4.Tests.E2E.csproj \
    --configuration Release \
    -- \
    --treenode-filter "*ImagingStudy*" \
    --ignore-exit-code "5;8"
  c2=$?
  set -e
  for code in "$c1" "$c2"; do
    if [[ "$code" -ne 0 && "$code" -ne 5 && "$code" -ne 8 ]]; then
      echo "ERROR: Tests gate failed with exit $code" >&2
      exit "$code"
    fi
  done
fi

echo "== Docker Compose up (project post-demo; leave running) =="
if [[ "$skip_build" -eq 1 ]]; then
  "${compose[@]}" up -d
else
  "${compose[@]}" up -d --build
fi

echo "== Smoke: GET http://localhost:${fhir_port}/metadata =="
ok=0
for i in $(seq 1 60); do
  code="$(curl -s -o /tmp/fhir-metadata-deploy-dev.json -w "%{http_code}" "http://localhost:${fhir_port}/metadata" || true)"
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
echo "Deploy to Dev (post-demo) succeeded."
echo "Containers: post-demo-fhir-api, post-demo-sql"
echo "FHIR: http://localhost:${fhir_port}/metadata"
echo "pre-demo (local-setup) on :8080 is untouched."
echo "Tear down post-demo only:"
echo "  docker compose -f samples/docker/docker-compose.yaml -f .cursor/skills/deploy-to-dev/docker-compose.deploy.yaml down"
echo "local-teardown removes pre-demo only — not this stack."
