---
name: pre-review-patterns
description: >-
  Pre-review pattern checks: catch deprecated APIs, unsafe patterns, and
  anti-patterns before code review. Parse→TryParse, Task.Wait/Result, bare
  catch, chained indexing, legacy packages, LINQ anti-patterns. Runs locally or
  as PR check. Use when implementing features or refactoring.
disable-model-invocation: false
---

# Pre-Review Pattern Checks

Catch mistakes early—deprecated APIs, anti-patterns, unsafe code—before they reach code review.
Runs as local checks or automated PR validation.

---

## High-Priority Rules (Production Impact)

### 1. Unsafe Parsing → TryParse Required

**Pattern:** `int.Parse()`, `long.Parse()`, `double.Parse()`, `DateTime.Parse()` without try-catch

**Why:** Throws `FormatException` on malformed input. In FHIR APIs, untrusted user input (dates, IDs, numeric search params) can crash endpoints.

**Locations Found:**
- `src/Microsoft.Health.Fhir.Core/Models/PartialDateTime.cs:172` — `int.Parse(match.Groups[YearCapture].Value)`
- `src/Microsoft.Health.Fhir.SqlServer/Features/Storage/SqlExportOrchestratorJob.cs:84` — `long.Parse()` without validation

**Rule:** Every `Parse()` must either:
- Be wrapped in try-catch with graceful error
- Use `TryParse()` instead
- Have a prevalidation guard that guarantees format (with comment)

**Scan Pattern:**
```regex
\b(int|long|double|DateTime|Guid)\.Parse\s*\(
```

**Fix Pattern:**
```csharp
// Before
int year = int.Parse(match.Groups[YearCapture].Value);

// After (preferred)
if (!int.TryParse(match.Groups[YearCapture].Value, out var year))
{
    throw new ArgumentException($"Invalid year format: {match.Groups[YearCapture].Value}");
}
```

---

### 2. Task Blocking → Use Async/Await

**Pattern:** `.Wait()`, `.Result`, `.WaitAll()`, `.WaitAny()` on Task objects (outside tests)

**Why:** Blocks thread pool threads, causing starvation in high-concurrency scenarios. Can deadlock if called from sync context waiting on async work.

**Locations Found:**
- `src/Microsoft.Health.TaskManagement.UnitTests/JobHostingTests.cs:361-383` — `Task.Delay(TimeSpan.FromSeconds(0.001)).Wait()`

**Rule:** No synchronous blocking on Tasks in production code.

**Scan Pattern:**
```regex
\.(?:Wait|Result)\s*(?:\(|$)
```

**Fix Pattern:**
```csharp
// Before (blocks)
var result = Task.Run(GetDataAsync).Result;

// After (async all the way)
var result = await GetDataAsync();
```

---

### 3. Bare Exception Catching → Specify Exception Types

**Pattern:** `catch (Exception)` without handling specific known exceptions

**Why:** Catches ThreadAbort, OutOfMemoryException, StackOverflowException, etc.—exceptions that should never be caught. Masks bugs.

**Locations Found:**
- `src/Microsoft.Health.Fhir.SqlServer.UnitTests/Features/Search/SqlServerSearchServiceQueryStoreTests.cs:746` — bare `catch (Exception)`
- `src/Microsoft.Health.Fhir.Api.UnitTests/Features/Bundle/BundleHandlerRuntimeTests.cs:157`

**Rule:** Catch only the exceptions you can actually handle. Rethrow others.

**Scan Pattern:**
```regex
catch\s*\(\s*Exception\s*\)
```

**Fix Pattern:**
```csharp
// Before
catch (Exception ex)
{
    _logger.LogError(ex, "Something failed");
}

// After (specific exception + rethrow unknown)
catch (ArgumentException ex)
{
    _logger.LogError(ex, "Invalid argument");
}
catch (IOException ex)
{
    _logger.LogError(ex, "I/O failure");
}
// All others propagate up
```

---

### 4. Chained Indexing Without Null Checks → Safe Navigation

**Pattern:** `obj["field"]["nested"]` or `obj["field"].ToString()` without null guard

**Why:** NullReferenceException if intermediate keys don't exist. In FHIR security/auth code (e.g., SMART scopes), crashes expose bad error messages.

**Locations Found:**
- `src/Microsoft.Health.Fhir.Api/Features/SmartHealthCards/AadSmartOnFhirProxyController.cs:250-251`
  ```csharp
  var launchStateParameters = JObject.Parse(Base64UrlEncoder.Decode(state));
  var launchParameters = JObject.Parse(Base64UrlEncoder.Decode(launchStateParameters["l"].ToString()));
  ```

**Rule:** Always validate key existence before chained access.

**Scan Pattern:**
```regex
\["[^"]+"\]\["
```

**Fix Pattern:**
```csharp
// Before
var launchState = launchStateParameters["l"].ToString();

// After
if (!launchStateParameters.TryGetValue("l", out var launchStateToken))
{
    throw new ArgumentException("Missing 'l' parameter in launch state");
}
var launchState = launchStateToken.ToString();
```

---

### 5. Legacy/Deprecated Packages → Migrate

**Pattern:** Dependency on deprecated NuGet packages

**Locations Found:**

#### a) **Azure Storage Blob SDK v11.x (EOL)**
- `Directory.Packages.props:80`
  ```xml
  <PackageVersion Include="Microsoft.Azure.Storage.Blob" Version="11.2.3" />
  ```
- **Issue:** v11.x is 3+ years old, no security updates. v12.x exists.
- **Migration:** Update to `Azure.Storage.Blobs` v12.x (breaking changes, but necessary)

#### b) **FHIR Validation Legacy Packages**
- `Directory.Packages.props:58-61`
  ```xml
  <PackageVersion Include="Hl7.Fhir.Validation.Legacy.STU3" />
  <PackageVersion Include="Hl7.Fhir.Validation.Legacy.R4" />
  ```
- **Issue:** "Legacy" is deprecated; modern FHIR library has updated validation.
- **Migration:** Use `Hl7.Fhir.Specification` and `Hl7.Fhir.Validation` (non-legacy)

**Rule:** Scan `Directory.Packages.props` for deprecated package names/versions and flag for replacement.

**Scan Pattern (in .props files):**
```xml
<!-- Flag these -->
<PackageVersion Include="Microsoft.Azure.Storage.Blob" ... />
<PackageVersion Include="Hl7.Fhir.Validation.Legacy.*" />
```

---

## Medium-Priority Rules (Code Quality)

### 6. LINQ Anti-Pattern: ForEach → Foreach Loop

**Pattern:** `.ForEach()` on LINQ results for side effects (not data transformation)

**Why:** Anti-pattern for side effects; `foreach` is clearer intent and allows early exit/break.

**Locations Found:**
- `src/.../OpenIddictApplicationCreater.cs:87` — `.ForEach()` used for logging/setup
- `src/.../SqlServerSearchService.cs` — `.ForEach()` in index building

**Scan Pattern:**
```regex
\.ForEach\s*\(
```

**Fix Pattern:**
```csharp
// Before
results.Where(x => x.IsValid).ForEach(x => x.Save());

// After
foreach (var item in results.Where(x => x.IsValid))
{
    item.Save();
}
```

---

### 7. Unsafe Array Access → Bounds Check or TryGetValue

**Pattern:** Direct indexing on `.Split()` or array access without bounds check

**Why:** `IndexOutOfRangeException` if array size differs from expected.

**Locations Found:**
- `src/.../AadSmartOnFhirProxyController.cs:315, 170`
  ```csharp
  var parts = value.Split(':');
  var id = parts[0];  // Crashes if Split returns empty
  ```
- `src/.../SmartClinicalScopesMiddleware.cs:145, 166`

**Scan Pattern:**
```regex
\.Split\([^)]*\)\[[0-9]\]
```

**Fix Pattern:**
```csharp
// Before
var parts = value.Split(':');
var id = parts[0];

// After
var parts = value.Split(':');
if (parts.Length < 1)
{
    throw new ArgumentException("Expected at least one part after split");
}
var id = parts[0];
```

---

### 8. String Concatenation Loops → StringBuilder or Interpolation

**Pattern:** String concatenation in loops (`"a" + "b" + "c"` or repeated `+=`)

**Why:** Creates O(n²) allocations; use `StringBuilder` (or `$""` for static cases).

**Locations Found:**
- `src/.../KnownRoutes.cs:17-44` — Route string assembly
- `src/.../OidcDiscoveryService.cs:98, 140-143` — URL building

**Scan Pattern:**
```regex
"[^"]*"\s*\+\s*"[^"]*"
```

**Fix Pattern:**
```csharp
// Before
string route = "/fhir/" + version + "/Patient/" + id;

// After (interpolation)
string route = $"/fhir/{version}/Patient/{id}";

// Before (loop)
var result = "";
foreach (var item in items)
{
    result += item.ToString();
}

// After (StringBuilder)
var sb = new StringBuilder();
foreach (var item in items)
{
    sb.Append(item);
}
var result = sb.ToString();
```

---

### 9. LINQ Materialization Waste → Defer Enumeration

**Pattern:** `.Where().ToList()` chains that materialize intermediate collections

**Why:** Unnecessary memory use; defer to `IEnumerable<T>` if not needed immediately.

**Locations Found:**
- `src/.../CosmosDbSearchParameterStatusDataStore.cs:88`
- `src/.../CosmosQueueClient.cs:123`

**Scan Pattern:**
```regex
\.Where\([^)]*\)\.ToList\(\)
```

**Fix Pattern:**
```csharp
// Before (materializes)
var active = allParams.Where(x => x.IsActive).ToList();
return active.Count() > 0;

// After (deferred)
return allParams.Where(x => x.IsActive).Any();
```

---

### 10. Manual Locking → Use SemaphoreSlim or Lock Primitives

**Pattern:** Manual `lock(_object)` blocks for synchronization (error-prone)

**Why:** `lock` is safe but can be error-prone in complex scenarios. `SemaphoreSlim` or `ReaderWriterLockSlim` are more explicit.

**Locations Found:**
- `src/.../SqlServerSearchService.cs:98` — private `static object _locker` with `lock(_locker)` calls

**Note:** Codebase already uses `SemaphoreSlim` elsewhere (line 117)—prefer that pattern.

**Rule:** New locking should use `SemaphoreSlim` or typed lock primitives, not bare `lock()`.

---

## Automation Rules

### For Local Development (Git Hook)

Run these rules pre-commit via Roslyn analyzers or simple grep patterns:

1. **High-priority rules** (1–5) are blocking—fix before commit
2. **Medium-priority rules** (6–10) are warnings—flag in CI, not local

### For PR Validation

Embed in GitHub Actions / Azure Pipelines:

1. Run all 10 rules on changed files
2. Report violations in PR comments
3. Block merge if high-priority violations found
4. Comment with fix suggestions from "Fix Pattern" above

---

## Scan Scripts

### Basic Grep Patterns (Quick Local Check)

```bash
# High-priority issues
grep -rn "\.Parse(" src/ | grep -v TryParse | grep -v "catch"
grep -rn "\.Wait\|\.Result" src/ | grep -v test
grep -rn "catch (Exception)" src/ | grep -v test

# Medium-priority issues
grep -rn "\.ForEach(" src/
grep -rn "Split\([^)]*\)\[[0-9]\]" src/
grep -rn "\.Where.*\.ToList" src/
```

### Roslyn Analyzer Rules (Recommended)

For deep integration, use Roslyn-based static analysis (or configure existing analyzers):
- `StyleCop.Analyzers` (IDE1006, SA rules)
- `AsyncFixer` (for Task.Wait detection)
- Custom DiagnosticAnalyzer for FHIR-specific rules

---

## Workflow

```
Pre-review linting:
- [ ] 1. Scan changed .cs files under src/ (PR blockers)
- [ ] 2. Scan repo baseline: Directory.Packages.props + src/ (known debt for QA)
- [ ] 3. Flag violations with fix suggestions
- [ ] 4. Verdict: Fail only if Critical hits appear in the diff
- [ ] 5. Link to this skill for context on each rule
```

---

## Report format (required — plain English for QA)

Write for someone who tests the FHIR server, not someone who wrote the C#.
Use these headers every time. Always run **two scans**:

1. **PR scan** — `.cs` files under `src/` in the current git diff (merge blockers).
2. **Baseline scan** — `Directory.Packages.props` + production code under `src/`
   (known debt the team should know about). Always include baseline findings even
   when the diff has no application files.

Do not mention skills, rules, docs, or other non-application paths.

### Scope

Two short bullets:

- **PR scan:** list changed `.cs` files under `src/`, or *None — no application
  files in this diff.*
- **Baseline scan:** always run against `Directory.Packages.props` and `src/`
  (exclude `*Tests*` / `*.UnitTests*` from pattern counts unless a test file is
  in the PR diff).

### Deprecated APIs

Always report from `Directory.Packages.props`. Split when relevant:

- **In this PR:** hits only in changed files (blocks if new deprecated use).
- **Existing codebase debt:** packages already referenced (informational).

One row per item: what it is, where it lives, why it matters in plain English.

### Critical — unsafe patterns

Rules 1–4. Split each subsection:

- **In this PR** — merge blockers; file, line, plain-English risk.
- **Existing codebase debt** — representative examples elsewhere in `src/` so QA
  knows what edge cases to watch when testing (not blockers for this PR).

| Pattern | Plain-English risk |
|---------|-------------------|
| Parse without TryParse | Bad input can crash the server |
| Task.Wait / .Result | Thread hangs under load |
| catch (Exception) | Real bugs get swallowed |
| Chained indexing without null check | Missing JSON field crashes auth/search |

### Medium — unsafe patterns

Rules 6–9. Same split: **In this PR** / **Existing codebase debt**. Warn in
review; do not block merge unless team policy says otherwise.

### Low — unsafe patterns

Rule 10 and similar. Same split. Informational only.

### Verdict

One line: **Pass** or **Fail** based on **Critical** hits in the **PR scan**
only. Baseline debt does not fail the PR. When Pass and the PR touched
application code, add: run `/strengthen-tests` next.

---

## Next: Strengthen Tests

After pre-review checks pass, run [strengthen-tests](../strengthen-tests/SKILL.md):
- Coverage gaps
- Weak test detection
- Anti-patterns in test code
