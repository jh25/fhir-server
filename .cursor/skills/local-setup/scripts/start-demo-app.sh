#!/usr/bin/env bash
# Starts midsizedclinic-demo-app against Docker SQL (localhost:1433).
# Requires: node/npm, FHIR SQL published on 1433 (demo compose overlay), FHIR API for seed.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
demo_dir="$repo_root/midsizedclinic-demo-app"

if [[ ! -d "$demo_dir" ]]; then
  echo "ERROR: demo app not found at $demo_dir" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: node/npm not found on PATH. Install Node.js 18+ and re-run." >&2
  exit 1
fi

cd "$demo_dir"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "created midsizedclinic-demo-app/.env from .env.example"
fi

# Stop a previous demo instance if we recorded its PID.
if [[ -f .demo-app.pid ]]; then
  old_pid="$(cat .demo-app.pid 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "stopping previous demo app (pid $old_pid)"
    kill "$old_pid" 2>/dev/null || true
    sleep 1
  fi
  rm -f .demo-app.pid
fi

echo "npm install (demo app)"
npm install --silent

echo "starting demo app on http://localhost:3000"
# Detach so setup.sh can finish; logs go to .demo-app.log
nohup npm start >.demo-app.log 2>&1 &
echo $! >.demo-app.pid

echo "waiting for http://localhost:3000/health"
ready=0
for _ in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "ERROR: demo app /health never returned 200. Last log lines:" >&2
  tail -n 40 .demo-app.log >&2 || true
  exit 1
fi

echo "demo /health -> 200"

echo "seeding MidSizedClinic demo data if missing (npm run seed)"
echo "  Patients: pat-1001 (Alex), pat-1002 (Blake)"
echo "  Studies:  stu-demo-us-1..3 + stu-demo-ct-1 (Alex), stu-demo-us-other (Blake)"
echo "  Skips when all stu-demo-* ids already exist; SEED_FORCE=1 to upsert"
npm run seed

echo "MidSizedClinic imaging demo: http://localhost:3000"
echo "  UI:      open http://localhost:3000/ (Alex/Blake tabs + typeahead)"
echo "  health:  curl http://localhost:3000/health"
echo "  Alex:    curl \"http://localhost:3000/Patient/pat-1001/ImagingStudy\" -H \"X-User-Role: clinicTechnician\" -H \"X-User-Id: tech-1204\""
echo "  Blake:   curl \"http://localhost:3000/Patient/pat-1002/ImagingStudy\" -H \"X-User-Role: clinicTechnician\" -H \"X-User-Id: tech-1204\""
