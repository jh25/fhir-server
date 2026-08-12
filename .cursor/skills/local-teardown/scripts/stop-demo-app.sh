#!/usr/bin/env bash
# Stops the MidSizedClinic imaging demo app (localhost:3000) if it is running.
set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
demo_dir="$repo_root/midsizedclinic-demo-app"
pid_file="$demo_dir/.demo-app.pid"

stopped=0

if [[ -f "$pid_file" ]]; then
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "stopping demo app (pid $pid from .demo-app.pid)"
    kill "$pid" 2>/dev/null || true
    # npm may leave a child node process; give it a moment then escalate.
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    stopped=1
  fi
  rm -f "$pid_file"
fi

# Fallback: anything still listening on 3000 (Windows Git Bash / stray node).
if command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "
    \$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    foreach (\$c in \$conns) {
      Write-Host \"stopping process on port 3000 (pid \$(\$c.OwningProcess))\"
      Stop-Process -Id \$c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  " 2>/dev/null && stopped=1 || true
elif command -v lsof >/dev/null 2>&1; then
  pids="$(lsof -ti tcp:3000 2>/dev/null || true)"
  if [[ -n "${pids:-}" ]]; then
    echo "stopping process(es) on port 3000: $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    stopped=1
  fi
fi

if [[ "$stopped" -eq 1 ]]; then
  echo "demo app stopped (or was not reachable on :3000)."
else
  echo "demo app: nothing to stop (no pid file / nothing on :3000)."
fi
