---
name: strengthen-tests
description: >-
  Strengthen tests before PR: find coverage gaps, weak tests, missing edge
  cases, and test anti-patterns. Untested error paths, over-mocked dependencies,
  fixture reuse. Use after features are implemented and pre-review-patterns pass.
disable-model-invocation: false
---

# Strengthen Tests Before PR

Identify weak tests, missing edge cases, and coverage gaps before PR review.
Runs post-implementation to strengthen test suites.

---

## Framework & Test Structure

**Testing Stack:**
- Framework: xUnit 2.9.3
- Mocking: NSubstitute
- Pattern: Arrange-Act-Assert
- Custom attributes: `RetryFactAttribute`, `RetryTheoryAttribute` (for flaky tests)
- Test layers: UnitTests, Integration, E2E

**Test Organization:**
```
test/
  Microsoft.Health.Fhir.Core.UnitTests/      # Isolated domain logic
  Microsoft.Health.Fhir.Api.UnitTests/       # Controllers, filters, actions
  Microsoft.Health.Fhir.*.Tests.Integration/ # Real DB, in-memory stores
  Microsoft.Health.Fhir.*.Tests.E2E/         # Full stack, HTTP layer
```

**Mandatory Traits (enforced via assembly validation):**
```csharp
[Trait(Traits.OwningTeam, OwningTeam.Fhir)]
[Trait(Traits.Category, Categories.AssemblyValidation)]
```

---

## Rule 1: Untested Error Paths

**Pattern:** Methods with multiple `throw` statements, but test coverage only validates happy path.

**Why:** FHIR APIs reject malformed requests with specific status codes. Missing error tests means:
- Error handling code is never exercised
- Errors may not serialize correctly (500 vs 400)
- Error messages may leak sensitive data

**Scope:** Focus on controller actions, validation handlers, and public API methods.

**Detection:**

In test files, scan for:
- Test class with method under test (e.g., `GetResourceHandler`)
- Count `if (...) throw` statements in source
- Count corresponding test cases with `Assert.Throws<>` or `Assert.ThrowsAsync<>`

**Examples to Look For:**

```csharp
// Source: GetResourceHandler.cs
public async Task<GetResourceResponse> Handle(GetResourceRequest request)
{
    if (request == null) throw new ArgumentNullException(nameof(request));
    if (string.IsNullOrWhiteSpace(request.ResourceId)) throw new ArgumentException(...);
    if (!_authzService.CanRead(request)) throw new FhirException(OperationOutcome.Error(...));
    
    var resource = await _store.GetResourceAsync(request.ResourceId);
    if (resource == null) throw new ResourceNotFoundException(...);
    
    return new GetResourceResponse { Resource = resource };
}

// Test: GetResourceHandlerTests.cs (WEAK — only 1 happy path test)
[Fact]
public async Task Handle_WithValidRequest_ReturnsResource()
{
    var response = await _handler.Handle(new GetResourceRequest { ResourceId = "123" });
    Assert.NotNull(response.Resource);
}

// MISSING TESTS:
// - null request → ArgumentNullException
// - empty ResourceId → ArgumentException
// - unauthorized → FhirException with OperationOutcome
// - resource not found → ResourceNotFoundException
```

**Rule:** For every `throw` in a public method, there must be a corresponding test case.

**Scan Pattern:**

```bash
# In test files, compare throw statements to test cases
grep -n "throw new" src/Microsoft.Health.Fhir.Core/Features/Handler.cs | wc -l
grep -n "Assert.Throws" test/Microsoft.Health.Fhir.Core.UnitTests/Features/HandlerTests.cs | wc -l
# These counts should match (or # of tests ≥ # of throws)
```

**Template to Add Missing Tests:**

```csharp
[Fact]
public async Task Handle_WithNullRequest_ThrowsArgumentNullException()
{
    // Act & Assert
    await Assert.ThrowsAsync<ArgumentNullException>(() => _handler.Handle(null));
}

[Fact]
public async Task Handle_WithUnauthorizedUser_ThrowsFhirException()
{
    // Arrange
    _authzService.CanRead(Arg.Any<GetResourceRequest>()).Returns(false);
    
    // Act & Assert
    var ex = await Assert.ThrowsAsync<FhirException>(
        () => _handler.Handle(new GetResourceRequest { ResourceId = "123" })
    );
    Assert.NotNull(ex.OperationOutcome);
}
```

---

## Rule 2: Over-Mocked Dependencies (Shallow Testing)

**Pattern:** Integration or E2E tests mock databases, file systems, or external services (should use real ones)

**Why:** FHIR Server has a documented test strategy:
- **UnitTests**: Mock domain dependencies, test business logic
- **Integration**: Use real databases (SQL in-memory, Cosmos emulator)
- **E2E**: Full stack; no mocks except external APIs

Mocking persistence layers in Integration tests defeats their purpose—they don't catch:
- SQL schema mismatches
- Cosmos query syntax errors
- Concurrency bugs in actual DB

**Locations to Check:**

1. Files in `Microsoft.Health.Fhir.*.Tests.Integration/`
2. Files in `Microsoft.Health.Fhir.*.Tests.E2E/`
3. Search for `Substitute.For<IFhirDataStore>`, `Substitute.For<ICosmosDbQueryRunner>`, etc.

**Detection:**

```bash
# In Integration/E2E test files, flag mock persistence:
grep -rn "Substitute.For<I.*DataStore\|IFhirDataStore\|ICosmosDb" test/*Integration test/*E2E
```

**Rule:**
- **UnitTests** → mock everything except the class under test
- **Integration** → real DB (in-memory), mock only external APIs (e.g., Azure Key Vault)
- **E2E** → real stack; no mocks except external services

**Template for Real DB Integration Test:**

```csharp
// BEFORE (WRONG — mocks persistence)
[Fact]
public async Task CreateResource_WithValidData_Succeeds()
{
    var mockStore = Substitute.For<IFhirDataStore>();
    mockStore.CreateAsync(Arg.Any<Resource>()).Returns(new CreateResourceResponse());
    
    var handler = new CreateResourceHandler(mockStore);
    var response = await handler.Handle(new CreateResourceRequest { ... });
    
    Assert.NotNull(response);
}

// AFTER (CORRECT — uses real in-memory DB)
[Fact]
public async Task CreateResource_WithValidData_Succeeds()
{
    // Arrange
    var dbOptions = new DbContextOptionsBuilder<FhirDbContext>()
        .UseInMemoryDatabase("TestDb")
        .Options;
    var realStore = new SqlServerFhirDataStore(new FhirDbContext(dbOptions));
    var handler = new CreateResourceHandler(realStore);
    
    // Act
    var response = await handler.Handle(new CreateResourceRequest { ... });
    
    // Assert
    Assert.NotNull(response);
    var stored = await realStore.GetAsync("123"); // Verify it's actually stored
    Assert.NotNull(stored);
}
```

---

## Rule 3: Insufficient Test Coverage

**Pattern:** Methods / classes with low test coverage (< 80% for new code, < 70% for legacy)

**Why:** Untested code has hidden bugs. FHIR compliance depends on correct behavior across versions.

**Scope:** Focus on:
1. **API Controllers** (highest risk—exposed to external input)
2. **Handlers** (business logic—should be near 100%)
3. **Search/Query builders** (complex logic, easy to miss edge cases)
4. **Authorization checks** (security-critical)

**Detection:**

```bash
# Generate coverage report (requires coverage tool integration)
# E.g., Coverlet + ReportGenerator:
dotnet test /p:CollectCoverage=true /p:CoverageFormat=cobertura

# Flag low-coverage files:
# Coverage < 70% → needs investigation
# New methods without tests → flag immediately
```

**Categories of Uncovered Code:**

| Type | Example | Test Gap |
|------|---------|----------|
| **Error handling** | Catch blocks, validation guards | No exception tests |
| **Edge cases** | Null checks, empty collections | Only happy-path tests |
| **Branches** | If/else, switch statements | Only one branch tested |
| **Async paths** | Task completion, cancellation | No async/timeout tests |
| **Resource versions** | STU3 vs R4 vs R5 branches | Only one version tested |

**Template for Coverage-Driven Tests:**

```csharp
// Source: SearchHandler.cs
public async Task<SearchResponse> Handle(SearchRequest request)
{
    if (request?.Query == null) return new SearchResponse { Bundle = new Bundle() };
    
    var results = await _store.SearchAsync(request.Query);
    if (results.Count == 0) 
    {
        return new SearchResponse { Bundle = new Bundle() };
    }
    
    return new SearchResponse { Bundle = FormatBundle(results) };
}

// Test: SearchHandlerTests.cs
[Theory]
[InlineData(null)]
[InlineData("")]
public async Task Handle_WithNullOrEmptyQuery_ReturnsEmptyBundle(string query)
{
    var response = await _handler.Handle(new SearchRequest { Query = query });
    Assert.Empty(response.Bundle.Entry);
}

[Fact]
public async Task Handle_WithNoResults_ReturnsEmptyBundle()
{
    _store.SearchAsync(Arg.Any<string>()).Returns(new List<Resource>());
    var response = await _handler.Handle(new SearchRequest { Query = "Patient?name=Unknown" });
    Assert.Empty(response.Bundle.Entry);
}

[Fact]
public async Task Handle_WithMultipleResults_FormatsBundleCorrectly()
{
    var results = new List<Resource> { new Patient(), new Patient() };
    _store.SearchAsync(Arg.Any<string>()).Returns(results);
    
    var response = await _handler.Handle(new SearchRequest { Query = "Patient" });
    Assert.Equal(2, response.Bundle.Entry.Count);
}
```

---

## Rule 4: Weak Assertions (Assertion Anti-Patterns)

**Pattern:** Tests that assert only on non-null or Count > 0, missing detailed verification

**Why:** Passing tests don't prove correctness. A test that only checks "response is not null" passes even if the response is completely wrong.

**Detection:**

In test files, flag assertions that are:
- Only `Assert.NotNull(result)`
- Only `Assert.True(list.Count > 0)`
- Missing property-level checks
- No verification of error codes, FHIR OperationOutcome, status codes

**Examples:**

```csharp
// WEAK (only checks existence)
[Fact]
public async Task GetResource_ReturnsResource()
{
    var response = await _handler.Handle(new GetResourceRequest { ResourceId = "123" });
    Assert.NotNull(response);  // ← Too weak
}

// STRONG (checks behavior + data)
[Fact]
public async Task GetResource_WithValidId_ReturnsResourceWithCorrectData()
{
    var response = await _handler.Handle(new GetResourceRequest { ResourceId = "123" });
    
    Assert.NotNull(response);
    Assert.Equal("123", response.Resource.Id);
    Assert.Equal(FhirResourceType.Patient, response.Resource.ResourceType);
    Assert.True(response.Resource.Meta?.LastUpdated < DateTime.UtcNow.AddSeconds(1));
}

// WEAK (HTTP level)
[Fact]
public async Task GetResource_ReturnsSuccessfulResponse()
{
    var response = await _client.GetAsync("/fhir/Patient/123");
    Assert.True(response.IsSuccessStatusCode);  // ← Too weak
}

// STRONG (HTTP level)
[Fact]
public async Task GetResource_WithValidId_Returns200WithResourceBody()
{
    var response = await _client.GetAsync("/fhir/Patient/123");
    
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    var patient = JsonConvert.DeserializeObject<Patient>(await response.Content.ReadAsStringAsync());
    Assert.Equal("123", patient.Id);
    Assert.NotNull(patient.Name);
}
```

**Rule:** Every test must assert on:
1. **Status/outcome** (success, exception type)
2. **Data** (returned values, properties)
3. **Side effects** (persisted state, audit logs)

---

## Rule 5: Missing Version-Specific Tests

**Pattern:** Handlers / parsers that behave differently for STU3/R4/R4B/R5 but tests only cover one version

**Why:** FHIR profiles and search parameters differ across versions. Code must support all versions correctly.

**Scope:** Focus on:
- Search parameter handlers
- Resource serialization/deserialization
- Validation rules
- Profiling/extension handling

**Detection:**

```bash
# In test files, search for @Trait markers:
grep -rn "@Trait.*R4\|R5\|STU3" test/

# If a handler supports multiple versions but tests only cover R4:
grep -l "FhirVersion.R4" src/**/*.cs | xargs -I {} grep -l "Handle\|Process" {}
# Check corresponding tests for R5/STU3 coverage
```

**Template for Version-Parameterized Tests:**

```csharp
[Theory]
[InlineData(FhirVersion.Stu3)]
[InlineData(FhirVersion.R4)]
[InlineData(FhirVersion.R5)]
public async Task Handle_WithValidRequest_SucceedsForAllVersions(FhirVersion version)
{
    var handler = _factory.CreateHandler(version);
    var response = await handler.Handle(new SearchRequest { Query = "Patient?name=John" });
    
    Assert.NotNull(response);
    Assert.Equal(version, response.FhirVersion);
}

[Theory]
[InlineData(FhirVersion.Stu3, "Patient.name")] // STU3 path
[InlineData(FhirVersion.R4, "Patient.name")]   // R4 path (same)
[InlineData(FhirVersion.R5, "Patient.name")]   // R5 path (may differ)
public async Task ParseSearchParameter_ExtractsCorrectPath(FhirVersion version, string expectedPath)
{
    var parser = new SearchParameterParser(version);
    var param = parser.Parse("name");
    
    Assert.Equal(expectedPath, param.FhirPath);
}
```

---

## Rule 6: Test Fixtures & Reuse Anti-Patterns

**Pattern:** Fixture creation scattered across tests; test data not isolated

**Why:** Shared state between tests causes:
- Flaky tests (one test affects another)
- Hidden dependencies
- Hard-to-debug test failures

**Rule:**
- Use `IAsyncLifetime` or `IDisposable` fixtures for setup/teardown
- Each test owns its data (use `@JsonPropertyName` factory methods, not global pools)
- Avoid `IClassFixture<>` for DB state; prefer fresh instances per test

**Detection:**

```bash
# Flag tests with shared/global state:
grep -rn "static.*=\|IClassFixture" test/**/*Tests.cs

# Flag missing fixture cleanup:
grep -rn "IAsyncLifetime\|Dispose" test/**/*Tests.cs | wc -l
# Should be high; low count suggests missing cleanup
```

**Template for Proper Fixture Management:**

```csharp
// ANTI-PATTERN (shared state, flaky)
public class PatientSearchTests
{
    private static PatientSearchDatabase _db = new();
    
    [Fact]
    public async Task Search_ReturnsPatients()
    {
        var results = await _db.Search("name=John");
        Assert.NotEmpty(results);  // Depends on prior test's data!
    }
}

// CORRECT (isolated, fresh DB per test)
public class PatientSearchTests : IAsyncLifetime
{
    private readonly FhirDbContext _dbContext;
    
    public PatientSearchTests()
    {
        var options = new DbContextOptionsBuilder<FhirDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())  // Fresh DB per test
            .Options;
        _dbContext = new FhirDbContext(options);
    }
    
    public async Task InitializeAsync()
    {
        // Setup: seed test data
        _dbContext.Patients.Add(new Patient { Id = "1", Name = "John" });
        await _dbContext.SaveChangesAsync();
    }
    
    public async Task DisposeAsync()
    {
        // Cleanup: dispose resources
        await _dbContext.DisposeAsync();
    }
    
    [Fact]
    public async Task Search_WithName_ReturnsMatchingPatient()
    {
        var results = await _dbContext.Patients.Where(p => p.Name == "John").ToListAsync();
        Assert.Single(results);
    }
}
```

---

## Rule 7: Flaky Tests & Retry Patterns

**Pattern:** Tests that intermittently fail due to timing, ordering, or concurrency

**Why:** Flaky tests erode confidence in the test suite; they mask real bugs.

**Detection:**

Tests marked with `[RetryFact]` or `[RetryTheory]` are already known to be flaky.

**Questions to Ask:**
1. Why does this test need retries?
2. Is there a timing/ordering issue? (Use `WaitForAsync()`)
3. Is there concurrent DB access? (Use transaction isolation)
4. Is it an external service flakiness? (Mock or skip in CI)

**Template for Fixing Flaky Tests:**

```csharp
// FLAKY (timing-dependent)
[Fact]
public async Task IndexAsync_UpdatesSearchIndex()
{
    _indexService.IndexAsync(resource);
    Thread.Sleep(100);  // ← Arbitrary wait, may fail on slow machines
    
    var indexed = await _indexStore.GetAsync(resource.Id);
    Assert.NotNull(indexed);
}

// FIXED (deterministic)
[Fact]
public async Task IndexAsync_UpdatesSearchIndex()
{
    var indexed = await _indexService.WaitForAsync(
        () => _indexStore.GetAsync(resource.Id),
        timeout: TimeSpan.FromSeconds(5),
        pollInterval: TimeSpan.FromMilliseconds(10)
    );
    
    Assert.NotNull(indexed);
}

// For external service calls (mock or skip):
[Fact(Skip = "External service flaky; re-enable after service upgrade")]
public async Task CallExternalApi_ReturnsData()
{
    // ...
}
```

---

## Workflow

```
Strengthen-tests checklist:
- [ ] 1. Run coverage analysis on changed code
- [ ] 2. Identify untested error paths (Rule 1)
- [ ] 3. Audit for over-mocked dependencies (Rule 2)
- [ ] 4. Scan for weak assertions (Rule 4)
- [ ] 5. Check version-specific coverage (Rule 5)
- [ ] 6. Review fixture lifecycle (Rule 6)
- [ ] 7. Audit for flaky tests (Rule 7)
- [ ] 8. Add missing tests per templates above
```

---

## Next: PR Check Integration

Once **pre-review-patterns** and **strengthen-tests** are validated:

1. **Local checks** → Git pre-commit hooks
2. **PR validation** → GitHub Actions / Azure Pipelines
3. **Reporting** → Inline comments with fix suggestions
