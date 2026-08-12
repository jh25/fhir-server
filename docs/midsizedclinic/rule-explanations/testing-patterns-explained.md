# Testing Patterns Explained

This document expands how MidSizedClinic contributors should test the Microsoft FHIR Server: frameworks, unit vs E2E scope, Arrange-Act-Assert, mocking boundaries, and naming.

For a quick summary, see [`.cursor/rules/FHIR-02-testing-patterns.mdc`](../../../.cursor/rules/FHIR-02-testing-patterns.mdc).

Also see [`AGENTS.md`](../../../AGENTS.md): xUnit, NSubstitute, Arrange-Act-Assert; unit tests for new functionality; E2E when the feature touches HTTP.

---

## 1. Why these frameworks?

| Choice | Why here |
|--------|----------|
| **xUnit** | Standard for modern .NET. Attributes (`[Fact]`, `[Theory]`), parallel-friendly defaults, first-class async. Do **not** introduce NUnit or MSTest. |
| **NSubstitute** | Arrange doubles with `Substitute.For<T>()`, stub with `.Returns(...)`, verify with `.Received(...)`. Less ceremony than Moq for interface-heavy DI code. Do **not** introduce Moq. |

Handlers and services already take interfaces (`IFhirDataStore`, `IAuthorizationService<DataActions>`, `ISearchService`, …). NSubstitute fits that shape: fake the boundary, run real business logic, assert outcomes and interactions.

---

## 2. Unit tests for handlers (and Core services)

### WHAT

A **unit test** constructs the system under test (SUT) in memory, injects **mocked** dependencies, and exercises one behavior. No SQL, no Cosmos, no Kestrel, no real HTTP.

Unit test projects live under `src/` (e.g. `Microsoft.Health.Fhir.Shared.Core.UnitTests`, `Microsoft.Health.Fhir.Core.UnitTests`).

### WHY

| Benefit | Detail |
|---------|--------|
| Fast feedback | Fail in seconds without storage or test hosts |
| Precise | Assert authz-before-write, exception paths, audit calls |
| Safe | No PHI fixtures required for most handler paths — stub store returns |

### HOW

1. `Substitute.For<IFhirDataStore>()` (and other ports).
2. Stub the methods the SUT will call (`.Returns(...)`).
3. `new YourHandler(mocks...)` — real handler code.
4. `await sut.HandleAsync(request, ct)` (or service method).
5. Assert return value / exception; optionally `Received(...)` on mocks.

### Real unit example — mocked authz (`AuthorizationServiceExtensionsTests`)

```csharp
// src/Microsoft.Health.Fhir.Core.UnitTests/Features/Security/Authorization/
// AuthorizationServiceExtensionsTests.cs
private static IAuthorizationService<DataActions> CreateAuthorizationService(
    DataActions requested,
    DataActions granted)
{
    var service = Substitute.For<IAuthorizationService<DataActions>>();
    service.CheckAccess(
        Arg.Is<DataActions>(x => x == requested),
        Arg.Any<CancellationToken>())
        .Returns(granted);
    return service;
}

// Later: Act via CheckCreateAccess / CheckGetAccess, then:
await service.Received(1).CheckAccess(
    Arg.Is<DataActions>(x => x == requested),
    Arg.Any<CancellationToken>());
```

Names describe the scenario: `GivenDataActions_WhenCheckingCreateAccess_ThenCheckAccessIsPerformedCorrectly`.

### Real unit example — mocked store + AAA (`DeletionServiceTests`)

```csharp
// src/Microsoft.Health.Fhir.Shared.Core.UnitTests/Features/Resources/Delete/
// DeletionServiceTests.cs
[Fact]
public async Task GivenBulkHardDelete_WhenResourcesAreDeleted_ThenAuditLoggerIsCalledWithBatchedAffectedItems()
{
    // Arrange — stub search + IFhirDataStore; SUT is real DeletionService
    var fhirDataStore = Substitute.For<IFhirDataStore>();
    // ... wire search results, request, factories ...

    // Act
    await _service.DeleteMultipleAsync(request, CancellationToken.None);

    // Assert — verify collaboration, not the mock's internals
    _auditLogger.Received().LogAudit(/* ... */);
}
```

---

## 3. E2E tests for HTTP endpoints

### WHAT

An **E2E / HTTP integration** test boots (or attaches to) the FHIR test host, calls the API with `TestFhirClient`, and asserts status codes, headers, and resource bodies. Storage backends are real for the fixture (SQL and/or Cosmos via `[HttpIntegrationFixtureArgumentSets]`).

E2E tests live under `test/Microsoft.Health.Fhir.Shared.Tests.E2E` (and version-specific E2E projects).

### WHY

Unit tests cannot prove routing, serialization, auth middleware, and store wiring work together. E2E is for **“does `POST /Observation` return 201 with Location?”** — not for every branch of handler logic.

### HOW

1. Class implements `IClassFixture<HttpIntegrationTestFixture>`.
2. Take `fixture.TestFhirClient` in the constructor.
3. Arrange a resource (often `Samples.GetDefaultObservation()`).
4. Act with `CreateAsync` / `ReadAsync` / etc.
5. Assert HTTP status, headers, and key resource fields.

### Real E2E example — create (`CreateTests`)

```csharp
// test/Microsoft.Health.Fhir.Shared.Tests.E2E/Rest/CreateTests.cs
[Theory]
[InlineData("Weight", "Observation")]
public async Task GivenAResource_WhenPostingToHttp_TheServerShouldRespondSuccessfully(
    string resourceFileName,
    string resourceType)
{
    using FhirResponse<Resource> response =
        await _client.CreateAsync(Samples.GetJsonSample<Resource>(resourceFileName));

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    Assert.NotNull(response.Headers.ETag);
    Assert.NotNull(response.Headers.Location);
    Assert.NotNull(response.Resource.Id);
}
```

### Real E2E example — read (`ReadTests`)

```csharp
// test/Microsoft.Health.Fhir.Shared.Tests.E2E/Rest/ReadTests.cs
[Fact]
public async Task GivenAnId_WhenGettingAResource_TheServerShouldReturnTheAppropriateResourceSuccessfully()
{
    Observation createdResource =
        await _client.CreateAsync(Samples.GetDefaultObservation().ToPoco<Observation>());

    using FhirResponse<Observation> readResponse =
        await _client.ReadAsync<Observation>(ResourceType.Observation, createdResource.Id);

    Assert.Equal(createdResource.Id, readResponse.Resource.Id);
    Assert.Equal(createdResource.Meta.VersionId, readResponse.Resource.Meta.VersionId);
}

[Fact]
public async Task GivenANonExistantId_WhenGettingAResource_TheServerShouldReturnANotFoundStatus()
{
    using FhirClientException ex = await Assert.ThrowsAsync<FhirClientException>(
        () => _client.ReadAsync<Observation>(ResourceType.Observation, Guid.NewGuid().ToString()));

    Assert.Equal(HttpStatusCode.NotFound, ex.StatusCode);
}
```

**Also:** Integration tests under `test/...Integration` (e.g. `CreateExportRequestHandlerTests`) sit between pure unit and full HTTP — real storage fixture + handler under test, still using NSubstitute for some collaborators. Prefer pure unit when the store can be mocked; use integration when the behavior *is* persistence.

---

## 4. Arrange-Act-Assert

Every test should read in three blocks:

| Phase | Job |
|-------|-----|
| **Arrange** | Build SUT, stubs, request / client payload |
| **Act** | One primary call (`HandleAsync`, `CreateAsync`, …) |
| **Assert** | Outcomes, exceptions, and necessary `Received` checks |

```csharp
// Arrange
var store = Substitute.For<IFhirDataStore>();
store.GetAsync(Arg.Any<ResourceKey>(), Arg.Any<CancellationToken>())
    .Returns((ResourceWrapper)null);
var sut = /* construct handler with store + authz mocks */;

// Act + Assert (exception path)
await Assert.ThrowsAsync<ResourceNotFoundException>(
    () => sut.HandleAsync(new GetResourceRequest(key), CancellationToken.None));
```

Avoid asserting halfway through setup, or performing a second unrelated Act after Assert. One behavior per test keeps failures readable.

---

## 5. What to mock — and what not to

| Mock (external / infrastructure) | Do not mock |
|----------------------------------|-------------|
| `IFhirDataStore` | The handler / service under test |
| `IAuthorizationService<DataActions>` | Your branching / validation logic |
| `ISearchService`, loggers, options wrappers | HL7.Fhir parser behavior (trust the library) |
| HTTP / clock / queue clients at the boundary | ASP.NET model binding “works” (cover via E2E if needed) |

**Anti-patterns**

- Mocking the SUT and then “testing” the mock
- Hitting SQL in a project named `*.UnitTests`
- Re-testing `System.Text.Json` or xUnit itself
- Over-mocking until the test only proves NSubstitute works

If you need a new persistence capability, mock the **interface** in unit tests and cover the SQL/Cosmos implementation in integration/E2E — same rule as production code ([architecture patterns](architecture-explained.md)).

---

## 6. Test naming: describe the scenario

Names should answer: **given what, when what, then what?**

This repo commonly uses:

`Given{Precondition}_When{Action}_Then{Result}`

Examples from the codebase:

- `GivenAResource_WhenPostingToHttp_TheServerShouldRespondSuccessfully`
- `GivenANonExistantId_WhenGettingAResource_TheServerShouldReturnANotFoundStatus`
- `GivenBulkHardDelete_WhenResourcesAreDeleted_ThenAuditLoggerIsCalledWithBatchedAffectedItems`
- `GivenDataActions_WhenCheckingCreateAccess_ThenCheckAccessIsPerformedCorrectly`

Equivalent style (also fine when consistent with nearby tests):

`Create_WithValidPatient_ReturnsCreatedStatus`

| Avoid | Prefer |
|-------|--------|
| `TestCreate` | Scenario + outcome |
| `Test1` | Readable Given/When/Then |
| Method-only names (`HandleAsync_Test`) | Behavior under a condition |

---

## 7. Choosing unit vs E2E (cheat sheet)

| You changed… | Write |
|--------------|--------|
| Handler / Core business rule | Unit test with NSubstitute |
| Authz extension / policy helper | Unit test (see `AuthorizationServiceExtensionsTests`) |
| HTTP status, headers, route, content negotiation | E2E (`CreateTests`, `ReadTests`, …) |
| SQL/Cosmos-specific persistence behavior | Integration or E2E with `[HttpIntegrationFixtureArgumentSets]` / storage fixtures |

**Build and fix compile errors before adding tests** (`AGENTS.md`). New HTTP surface without E2E is incomplete; new handler branches without unit coverage are incomplete.

---

## Checklist

1. **xUnit + NSubstitute** only — no NUnit/MSTest/Moq.
2. **AAA** visible in every test.
3. **Unit:** mock `IFhirDataStore` / `IAuthorizationService` (and similar); run real handler logic.
4. **E2E:** `TestFhirClient` + real host; assert HTTP contracts.
5. **Name** the scenario (`Given_When_Then` or equivalent).
6. **Do not** mock your own logic or test third-party/framework internals.

Lean reminder: [`.cursor/rules/FHIR-02-testing-patterns.mdc`](../../../.cursor/rules/FHIR-02-testing-patterns.mdc).
