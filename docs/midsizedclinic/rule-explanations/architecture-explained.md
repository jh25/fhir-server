# Architecture Patterns Explained

This document expands the three patterns every contributor must follow when changing business logic, controllers, or persistence in the Microsoft FHIR Server (MidSizedClinic’s clinical data platform).

For a quick summary, see [`.cursor/rules/FHIR-00-architecture-patterns.mdc`](../../../.cursor/rules/FHIR-00-architecture-patterns.mdc).

---

## How the pieces fit together

```
HTTP request
  → Controller (route / bind / serialize only)
    → IMediator.SendAsync (or typed extension)
      → Handler.HandleAsync
           1) AuthorizationService.Check*Access   ← first
           2) Business logic
           3) IFhirDataStore.GetAsync / UpsertAsync ← only persistence path
      ← Response
  ← IActionResult
```

If a change breaks any one of these, it is not ready to merge.

> **Naming note:** `AGENTS.md` still says “MediatR.” The code uses the **Medino** namespace (`using Medino;`) with the same Request / Handler / `SendAsync` pattern. Prefer Medino when reading or writing code.

---

## 1. Medino handler pattern

### WHAT it is

A **request/response mediator** pattern: controllers stay thin HTTP adapters; **handlers** own all domain work.

- Controllers implement ASP.NET actions (`Read`, `Create`, …).
- Each action builds a typed **request** object and hands it to `IMediator`.
- Medino resolves the matching `IRequestHandler<TRequest, TResponse>` and calls `HandleAsync`.
- The handler returns a response; the controller maps it to an `IActionResult`.

### WHY it matters

| Concern | Why handlers win |
|---------|------------------|
| Separation | HTTP routing/binding stays out of FHIR business rules |
| Testability | Handlers can be unit-tested without spinning up the web host |
| Reuse | The same create/get logic runs from REST, bundles, and other entry points |
| Consistency | New features follow one path: request → handler → response |

Putting validation, authorization, or store calls inside a controller action couples domain logic to ASP.NET and makes the same rules hard to reuse from bundle processing or background jobs.

### HOW it works (step-by-step)

1. Client hits a FHIR route (e.g. `GET /Patient/{id}` or `POST /ImagingStudy`).
2. `FhirController` binds route/body parameters.
3. Controller constructs a request (`GetResourceRequest`, `CreateResourceRequest`, …), often including `GetBundleResourceContext()` for audit.
4. Controller calls a typed mediator extension (`GetResourceAsync`, `CreateResourceAsync`) or `_mediator.SendAsync<TResponse>(...)` directly.
5. The extension calls `mediator.SendAsync(...)`.
6. Medino invokes the registered handler’s `HandleAsync`.
7. Handler returns a response object; controller wraps it as `FhirResult` (status, ETag, Location, etc.).

### Real code examples

**Thin controller — read** (`FhirController.Read`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Api/Controllers/FhirController.cs
public async Task<IActionResult> Read(string typeParameter, string idParameter)
{
    RawResourceElement response = await _mediator.GetResourceAsync(
        new GetResourceRequest(
            new ResourceKey(typeParameter, idParameter),
            GetBundleResourceContext()),
        HttpContext.RequestAborted);

    return FhirResult.Create(response)
        .SetETagHeader()
        .SetLastModifiedHeader();
}
```

**Thin controller — create** (`FhirController.Create`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Api/Controllers/FhirController.cs
public async Task<IActionResult> Create([FromBody] Resource resource)
{
    var response = await ExecuteWithSearchParameterRetryAsync(
        resource.TypeName,
        () => _mediator.CreateResourceAsync(
            new CreateResourceRequest(resource.ToResourceElement(), GetBundleResourceContext()),
            HttpContext.RequestAborted),
        "Create");

    return FhirResult.Create(response, HttpStatusCode.Created)
        .SetETagHeader()
        .SetLastModifiedHeader()
        .SetLocationHeader(_urlResolver);
}
```

**Mediator bridge** (`FhirMediatorExtensions` wraps `SendAsync`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Extensions/FhirMediatorExtensions.cs
public static async Task<RawResourceElement> CreateResourceAsync(
    this IMediator mediator,
    CreateResourceRequest createResourceRequest,
    CancellationToken cancellationToken = default)
{
    UpsertResourceResponse result =
        await mediator.SendAsync<UpsertResourceResponse>(createResourceRequest, cancellationToken);

    return result.Outcome.RawResourceElement;
}
```

**Handler contract** (`CreateResourceHandler`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Features/Resources/Create/CreateResourceHandler.cs
public class CreateResourceHandler
    : BaseResourceHandler,
      IRequestHandler<CreateResourceRequest, UpsertResourceResponse>
{
    public async Task<UpsertResourceResponse> HandleAsync(
        CreateResourceRequest request,
        CancellationToken cancellationToken)
    {
        // authorization → domain work → IFhirDataStore (see sections below)
    }
}
```

### Anti-pattern

Business logic in the controller: validating FHIR content, checking roles, resolving references, or calling `IFhirDataStore` / SQL inside `FhirController` actions.

**Smell:** a controller method longer than “build request → send → map to HTTP,” or any `if` that encodes FHIR rules rather than HTTP concerns.

---

## 2. IFhirDataStore abstraction (never direct SQL)

### WHAT it is

`IFhirDataStore` is the **only** persistence contract handlers use for FHIR resources. Implementations exist for SQL Server and Azure Cosmos DB. Handlers depend on the interface; DI supplies the configured backend.

Key operations include `GetAsync`, `UpsertAsync`, `MergeAsync`, and `HardDeleteAsync` — see:

`src/Microsoft.Health.Fhir.Core/Features/Persistence/IFhirDataStore.cs`

### WHY it matters

| Concern | Why the abstraction exists |
|---------|----------------------------|
| Dual backends | MidSizedClinic (and upstream) can run SQL or Cosmos without forking handlers |
| Layering | Core stays SQL-agnostic (`AGENTS.md`: keep Core/API free of SQL) |
| Testability | Handlers mock `IFhirDataStore` without a real database |
| Correctness | Search indexing, history, and concurrency live in store implementations |

Raw SQL (or Cosmos SDK calls) inside a handler locks the feature to one backend and bypasses shared indexing / history behavior.

### HOW it works (step-by-step)

1. Handler inherits `BaseResourceHandler` (or injects `IFhirDataStore` directly).
2. Domain work prepares a `ResourceWrapper` (and often a `ResourceWrapperOperation`).
3. Handler calls `FhirDataStore.UpsertAsync(...)` or `GetAsync(...)`.
4. The registered store (`SqlServerFhirDataStore` or `CosmosFhirDataStore`) persists the resource and updates search indices as needed.
5. Handler maps the store outcome into a mediator response.

Handlers never open `SqlConnection`, write T-SQL, or call the Cosmos client for resource CRUD.

### Real code example

**Create path — persist only through the store** (`CreateResourceHandler`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Features/Resources/Create/CreateResourceHandler.cs
ResourceWrapper resourceWrapper = ResourceWrapperFactory.CreateResourceWrapper(
    resource, ResourceIdProvider, deleted: false, keepMeta: true);
bool keepHistory = await ConformanceProvider.Value.CanKeepHistory(resource.TypeName, cancellationToken);

UpsertOutcome result = await FhirDataStore.UpsertAsync(
    new ResourceWrapperOperation(
        resourceWrapper,
        true,
        keepHistory,
        null,
        false,
        false,
        request.BundleResourceContext),
    cancellationToken);

resource.VersionId = result.Wrapper.Version;

return new UpsertResourceResponse(
    new SaveOutcome(new RawResourceElement(result.Wrapper), SaveOutcomeType.Created));
```

**Read path — get through the store** (`GetResourceHandler`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Features/Resources/Get/GetResourceHandler.cs
currentDoc = await FhirDataStore.GetAsync(key, cancellationToken);
```

Constructor injection on create:

```csharp
public CreateResourceHandler(
    IFhirDataStore fhirDataStore,
    /* ... */,
    IAuthorizationService<DataActions> authorizationService)
    : base(fhirDataStore, conformanceProvider, resourceWrapperFactory, resourceIdProvider, authorizationService)
```

### Anti-pattern

- `new SqlCommand(...)`, ADO.NET, EF/`DbContext` queries for FHIR resources inside a handler
- Calling Cosmos SDK APIs from Core/Shared.Core for CRUD
- Copying SQL from `Microsoft.Health.Fhir.SqlServer` into a handler “just this once”

**Fix:** extend `IFhirDataStore` (and both implementations) if you need a new persistence capability — do not bypass the interface.

---

## 3. Authorization checks first

### WHAT it is

Every handler that performs FHIR data actions must call `IAuthorizationService<DataActions>` **before** side-effecting work. On `BaseResourceHandler` this is exposed as `AuthorizationService` with helpers such as:

- Create → `CheckCreateAccess`
- Read/get → `CheckGetAccess`
- Other actions → matching `Check*Access` methods

Authentication (“who are you?”) is not enough. Authorization (“may you do this data action?”) is enforced in the handler.

### WHY it matters

| Concern | Why check first |
|---------|-----------------|
| Security | Fail closed before create/update/delete/search side effects |
| Compliance | Avoid partial writes or misleading audit trails that imply success then rollback |
| Efficiency | Do not spend CPU/IO on work that will be forbidden |
| Consistency | Same check whether the call came from REST or an inner bundle request |

Checking only at the controller (or after `UpsertAsync`) is unsafe: other entry points can skip the controller, and a failed authz after write is already too late.

### HOW it works (step-by-step)

1. Handler enters `HandleAsync`.
2. Null-guard the request (`EnsureArg.IsNotNull`).
3. **Immediately** call the matching `AuthorizationService.Check*Access(cancellationToken)`.
4. On failure the service throws; the API layer maps that to **403 Forbidden**.
5. Only then run domain logic and `IFhirDataStore` calls.

### Real code examples

**Create — authz before any create work** (`CreateResourceHandler`, ~line 51):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Features/Resources/Create/CreateResourceHandler.cs
public async Task<UpsertResourceResponse> HandleAsync(
    CreateResourceRequest request,
    CancellationToken cancellationToken)
{
    EnsureArg.IsNotNull(request, nameof(request));

    await AuthorizationService.CheckCreateAccess(cancellationToken);

    var resource = request.Resource.ToPoco<Resource>();
    // ... reference resolve, wrapper, UpsertAsync ...
}
```

**Read — authz before get** (`GetResourceHandler`):

```csharp
// src/Microsoft.Health.Fhir.Shared.Core/Features/Resources/Get/GetResourceHandler.cs
public async Task<GetResourceResponse> HandleAsync(
    GetResourceRequest request,
    CancellationToken cancellationToken)
{
    EnsureArg.IsNotNull(request, nameof(request));

    await AuthorizationService.CheckGetAccess(cancellationToken);

    // ... then GetAsync / search for SMART fine-grained access ...
}
```

### Anti-pattern

- Checking authorization only in the controller
- Calling `Check*Access` **after** `UpsertAsync` / `GetAsync` / other side effects
- Skipping the check because “the route already requires a token” — **authn ≠ authz**
- Implementing a new handler with business logic and store calls but no `Check*Access`

---

## Checklist when you add a feature

1. **Controller** — bind HTTP, build request (include bundle/audit context), call mediator, map HTTP result.
2. **Handler** — `Check*Access` first; then domain logic; then `IFhirDataStore` only.
3. **No SQL/Cosmos** in Core/Api handlers — extend the store interface if needed.
4. **Tests** — unit-test the handler with a mocked `IFhirDataStore` and authorization service.

Lean reminder: [`.cursor/rules/FHIR-00-architecture-patterns.mdc`](../../../.cursor/rules/FHIR-00-architecture-patterns.mdc).
