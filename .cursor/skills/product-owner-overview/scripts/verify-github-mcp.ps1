# Verifies GitHub MCP prerequisites for product-owner-overview.
# Does not print the token. Exits 0 when PAT works against microsoft/fhir-server.
$ErrorActionPreference = "Stop"

$token = $env:GITHUB_PERSONAL_ACCESS_TOKEN
if (-not $token) {
    Write-Error @"
GITHUB_PERSONAL_ACCESS_TOKEN is not set.

Set a fine-grained PAT (public repos: Issues read, Pull requests read, Metadata read):
  [System.Environment]::SetEnvironmentVariable('GITHUB_PERSONAL_ACCESS_TOKEN', 'ghp_...', 'User')

Then restart Cursor so .cursor/mcp.json can read the env var.
"@
    exit 1
}

Write-Host "== GitHub PAT present (length $($token.Length)) =="

$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    Write-Host "Authenticated as: $($user.login)"
}
catch {
    Write-Error "GitHub API auth failed: $($_.Exception.Message)"
    exit 1
}

try {
    $issues = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/fhir-server/issues?state=open&labels=VSTS-Backlog&per_page=3" -Headers $headers
    Write-Host "Upstream reachable: microsoft/fhir-server (sample open VSTS-Backlog issues: $($issues.Count))"
    foreach ($issue in $issues) {
        Write-Host "  #$($issue.number) $($issue.title)"
    }
}
catch {
    Write-Error "Cannot read microsoft/fhir-server issues: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "Next: restart Cursor, confirm Settings -> Tools & MCP shows green dot on 'github',"
Write-Host "then run /product-owner-overview or ask the agent to fetch upstream backlog via GitHub MCP."
