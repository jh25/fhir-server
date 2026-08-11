#!/usr/bin/env bash
# Confirms the server answers, then re-checks whether each of the three workarounds in
# SKILL.md is still needed. This skill documents defects in someone else's repo, so it
# has to be able to say when Microsoft has fixed one and this file is out of date.
set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
cd "$repo_root"

echo "== waiting for http://localhost:8080/metadata =="
answered=0
for _ in $(seq 1 12); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/metadata 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    answered=1
    break
  fi
  sleep 5
done

if [[ "$answered" -eq 1 ]]; then
  echo "server answered 200 on http://localhost:8080/metadata"
else
  echo "ERROR: server never returned 200." >&2
  echo "docker compose -f samples/docker/docker-compose.yaml -f $skill_dir/docker-compose.local.yaml logs fhir-api" >&2
  echo "is the fastest way to see why." >&2
fi

echo
echo "== staleness canary: is each workaround still needed? =="

echo "-- R4.slnf / MSB5028 --"
slnf_log="$(mktemp)"
if dotnet build R4.slnf >"$slnf_log" 2>&1; then
  echo "R4.slnf now builds cleanly. The Crucible.shproj reference in R4.slnf/R5.slnf has"
  echo "apparently been fixed upstream - step 2 in SKILL.md (building R4.Web.csproj"
  echo "directly instead of the .slnf) may no longer be necessary."
elif grep -q "MSB5028" "$slnf_log"; then
  echo "still fails with MSB5028 as documented - workaround still needed."
else
  echo "still fails, but not with MSB5028 - the failure mode changed, see $slnf_log."
fi
rm -f "$slnf_log"

echo
echo "-- empty ASSEMBLY_VER / MSB4044 --"
pub_log="$(mktemp)"
pub_out="$(mktemp -d)"
if dotnet publish src/Microsoft.Health.Fhir.R4.Web/Microsoft.Health.Fhir.R4.Web.csproj \
  -o "$pub_out" -f net10.0 -p:AssemblyVersion="" -p:FileVersion="" -p:Version="" \
  >"$pub_log" 2>&1; then
  echo "publish succeeded with an empty version. The .NET SDK's GetAssemblyVersion /"
  echo "NuGetVersion requirement appears to have relaxed - step 4's ASSEMBLY_VER=1.0.0"
  echo "pin may no longer be necessary."
elif grep -q "GetAssemblyVersion" "$pub_log"; then
  echo "still fails with the GetAssemblyVersion/NuGetVersion error as documented -"
  echo "workaround still needed."
else
  echo "still fails, but not with GetAssemblyVersion - the failure mode changed, see $pub_log."
fi
rm -rf "$pub_log" "$pub_out"

echo
echo "-- SecurityProvider Authority null-check --"
security_provider="src/Microsoft.Health.Fhir.Shared.Api/Features/Security/SecurityProvider.cs"
if grep -q "EnsureArg.IsNotNull(securityConfiguration.Value.Authentication.Authority" "$security_provider"; then
  echo "still requires a non-null Authority unconditionally - the Authority override in"
  echo "docker-compose.local.yaml is still needed."
else
  echo "the unconditional null-check this skill works around is gone from"
  echo "$security_provider. Re-read the constructor by hand - the override may no"
  echo "longer be necessary."
fi
