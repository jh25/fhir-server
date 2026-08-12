#!/usr/bin/env bash
# Stops the local FHIR server stack by default. Pass --down to remove containers and
# the network too - that also destroys the SQL data, since the sql service has no
# volume, so it's opt-in only.
set -uo pipefail

mode="stop"
if [[ "${1:-}" == "--down" ]]; then
  mode="down"
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
cd "$repo_root"

compose_args=(-f samples/docker/docker-compose.yaml -f "$skill_dir/docker-compose.local.yaml")

report() {
  local label="$1"
  local running
  running="$(docker ps --filter "name=pre-demo-fhir-api" --filter "name=pre-demo-sql" --format '{{.Names}}\t{{.Status}}')"
  if [[ -z "$running" ]]; then
    echo "$label: nothing running."
  else
    echo "$label:"
    echo "$running"
  fi
}

report "before"
echo

echo "== stop MidSizedClinic imaging demo app =="
"$script_dir/stop-demo-app.sh"
echo

# Include demo overlay when present so compose project matches local-setup (sql:1433).
demo_compose="$repo_root/midsizedclinic-demo-app/docker-compose.demo.yaml"
if [[ -f "$demo_compose" ]]; then
  compose_args+=(-f "$demo_compose")
fi

if [[ "$mode" == "down" ]]; then
  echo "running 'docker compose down': this removes the containers and network, and"
  echo "since the sql service has no volume, the database (and demo seed data) goes with them."
  echo "There's nothing to resume - local-setup will build and initialize from scratch next time."
  docker compose "${compose_args[@]}" down
else
  echo "running 'docker compose stop': containers and the database are kept, just"
  echo "halted. 'docker compose start' (or local-setup/scripts/setup.sh) resumes from"
  echo "here. Demo seed data in SQL is preserved. Pass --down if you want a full removal."
  docker compose "${compose_args[@]}" stop
fi

echo
report "after"
