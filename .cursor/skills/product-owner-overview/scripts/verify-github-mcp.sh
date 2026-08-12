#!/usr/bin/env bash
# Verifies GitHub MCP prerequisites for product-owner-overview.
set -uo pipefail

if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set." >&2
  echo "Create a fine-grained PAT with public repo Issues/Pull requests/Metadata read," >&2
  echo "set the env var, then restart Cursor." >&2
  exit 1
fi

echo "== GitHub PAT present (length ${#GITHUB_PERSONAL_ACCESS_TOKEN}) =="

user="$(curl -sS -H "Authorization: Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user)"
login="$(echo "$user" | grep -o '"login"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
if [[ -z "$login" ]]; then
  echo "ERROR: GitHub API auth failed." >&2
  echo "$user" >&2
  exit 1
fi
echo "Authenticated as: $login"

issues="$(curl -sS -H "Authorization: Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/microsoft/fhir-server/issues?state=open&labels=VSTS-Backlog&per_page=3")"
count="$(echo "$issues" | grep -c '"number"' || true)"
echo "Upstream reachable: microsoft/fhir-server (sample open VSTS-Backlog issues: $count)"

echo
echo "Restart Cursor and confirm Settings -> Tools & MCP shows green dot on github."
