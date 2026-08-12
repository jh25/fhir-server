# PHI Safety Explained

We're a healthcare clinic under HIPAA. Patient data protection isn't optional.

This document expands the PHI / HIPAA rules every contributor must follow when logging, loading test data, searching by patient, or persisting resources on MidSizedClinic’s FHIR Server.

For a quick summary, see [`.cursor/rules/FHIR-01-phi-safety.mdc`](../../../.cursor/rules/FHIR-01-phi-safety.mdc).

---

## What is PHI?

**Protected Health Information (PHI)** is any individually identifiable health information that relates to a person’s health, care, or payment for care. In FHIR terms, that often lives inside resource bodies and search values — not just in a field named `Patient`.

| Usually SAFE to log / expose in ops tooling | Usually UNSAFE (treat as PHI) |
|---------------------------------------------|-------------------------------|
| Opaque resource ID (`Patient/abc-123`) | Patient name, address, phone, email |
| Action type (`Create`, `Read`, `$export`) | MRN / national ID / SSN-like identifiers in clear text |
| Authenticated user / client ID (non-clinical) | Diagnosis codes with enough context to identify someone |
| Timestamp, correlation / request ID | Imaging findings, clinical notes, free-text narratives |
| Counts, durations, HTTP status | Age + rare condition + clinic site (quasi-identifiers) |
| Resource **type** (`ImagingStudy`) | Full resource JSON / NDJSON payloads |

**Rule of thumb:** if a string could help someone re-identify a MidSizedClinic patient outside the authorized clinical app, it is PHI. When unsure, log the resource ID and correlation ID only.

HIPAA (and MidSizedClinic policy) cares about **use, disclosure, and retention**. Application logs, crash dumps, APM traces, and support tickets are all disclosure channels. Encrypting the database does not make it safe to print names into App Insights.

---

## 1. Never log PHI

### WHAT it is

Structured logging may record **operational identifiers** so we can debug and audit. It must not record **clinical or demographic content** from FHIR resources.

Safe examples: user ID, action type, resource ID, timestamp, correlation ID.
Unsafe examples: patient name, MRN, diagnosis text, medical findings, age, contact info.

### WHY it matters

| Risk | What goes wrong |
|------|-----------------|
| Log aggregation | PHI lands in central logging (App Insights, Splunk, files) outside the clinical system of record |
| Retention | Logs are kept longer and copied more widely than the FHIR store |
| Access control | On-call engineers and vendors who can read logs may not be cleared for chart access |
| Breach surface | A leaked log stream is a HIPAA breach even if the SQL/Cosmos DB stayed locked down |
| Support tickets | Pasting a “helpful” log line into email/Slack multiplies disclosure |

At MidSizedClinic, imaging and patient workflows produce exactly the data attackers and auditors care about. Logging “just the name for debugging” is still a violation.

### HOW to identify PHI in a log line

Ask:

1. Does this value come from a FHIR resource body or search parameter value?
2. Could it identify a person alone or with other log fields?
3. Would I paste this into a public GitHub issue?

If yes to (1) or (2), do not log it. Prefer resource IDs and correlation IDs already on `IFhirRequestContext`.

### Right vs wrong

```csharp
// ❌ WRONG — PHI in message and exception text
_logger.LogInformation(
    $"Created imaging for {patient.Name} MRN={patient.Identifier.First().Value}");

_logger.LogError(ex, "Failed upsert for {Resource}", resource.ToJson());

// ✅ RIGHT — identifiers and outcome only
_logger.LogInformation(
    "ImagingStudy created. ResourceId={ResourceId} CorrelationId={CorrelationId}",
    resourceId,
    correlationId);

_logger.LogError(
    ex,
    "Upsert failed. ResourceType={ResourceType} ResourceId={ResourceId}",
    resourceType,
    resourceId);
```

Patterns already used in-repo tend toward counts and request IDs, not patient demographics — e.g. delete paths log resource counts with a request GUID, not patient names.

### Anti-patterns

- String interpolation of `Resource.ToJson()`, `ToString()` on Patient/HumanName, or search query values that contain names
- Logging the full `Authorization` header or tokens (credentials ≠ PHI, but equally forbidden)
- Putting PHI in metric dimension labels (“patientName” as a custom dimension)
- “Temporary” debug logs that ship to production sinks
- Catch blocks that do `_logger.LogError(ex, resource.ToJson())`

---

## 2. Never read PHI test fixtures in production code

### WHAT it is

Test fixtures — sample `Patient*.json`, imaging examples, NDJSON batches, synthetic HL7 files — exist so **tests** can exercise the server. They are not seed data for production handlers, background jobs, or API controllers.

Production code under `src/` must not open, embed, or hard-code paths to those fixtures to “bootstrap” behavior.

### WHY it matters

| Risk | What goes wrong |
|------|-----------------|
| Accidental disclosure | Fixture content may look synthetic but can still contain realistic demographics |
| Wrong environment behavior | A handler that loads a fixture file behaves differently in CI vs Azure |
| Audit confusion | Creates/updates that did not come from a real client break provenance |
| Policy | MidSizedClinic production systems must process only authorized clinical/API input |

Even if a fixture is obviously fake (“John Doe”), baking it into production paths trains the team to treat patient-shaped JSON as casual data.

### Right vs wrong

```csharp
// ❌ WRONG — production handler reaches into test data
var json = await File.ReadAllTextAsync("test/Fixtures/Patient-example.json");
var patient = new FhirJsonParser().Parse<Patient>(json);
await FhirDataStore.UpsertAsync(/* ... */);

// ❌ WRONG — embedding fixture JSON as a default Patient in Core
private const string DefaultPatientJson = """{"resourceType":"Patient","name":[...]}""";

// ✅ RIGHT — production handlers only use the request payload / store
public async Task<UpsertResourceResponse> HandleAsync(
    CreateResourceRequest request,
    CancellationToken cancellationToken)
{
    await AuthorizationService.CheckCreateAccess(cancellationToken);
    var resource = request.Resource.ToPoco<Resource>();
    // ... wrap and UpsertAsync from the request, not from disk fixtures
}

// ✅ RIGHT — fixtures stay in tests
// test/.../Patient-example.json loaded only by test projects
```

### Anti-patterns

- `src/` projects with project references or content copies of `test/**` fixture files
- Startup code that “ensures a demo Patient exists” by reading committed JSON
- Copy-pasting fixture demographics into production configuration
- Using real clinic exports as committed fixtures without scrubbing (also a repo hygiene failure)

---

## 3. Compartment boundaries

### WHAT it is

FHIR **compartments** scope data to a context such as a patient. A compartment search like:

`GET /Patient/{id}/ImagingStudy`

must return **only** ImagingStudy resources that belong to that patient — not every study in the clinic.

Authorization and search rewriters, together with store-backed search, enforce these boundaries. Handlers and custom queries must not bypass them.

### WHY it matters

| Risk | What goes wrong |
|------|-----------------|
| Wrong-patient disclosure | Clinician or client for Patient A sees Patient B’s imaging |
| HIPAA minimum necessary | Access must be limited to data needed for the job |
| SMART / fine-grained access | Patient-scoped apps rely on compartment and search filters |
| Trust | MidSizedClinic’s safety story collapses if one IDOR-style query leaks charts |

`IFhirDataStore` and the search pipeline are where enforcement lives for many paths. Do not “simplify” a feature by querying all resources of a type and filtering in memory without the same guarantees — that is how compartment bugs ship.

### Right vs wrong

```http
# ✅ RIGHT — compartment route; server scopes to that patient
GET /Patient/pat-1001/ImagingStudy

# ❌ WRONG mental model — "I'll load all ImagingStudy and filter in the app"
GET /ImagingStudy?_count=1000
# then client-side filter by subject — easy to get wrong; leaks under bugs
```

```csharp
// ❌ WRONG — handler loads everything, ignores compartment/SMART constraints
var all = await SearchEverythingAsync("ImagingStudy", cancellationToken);
return all.Where(s => s.Subject == request.PatientId);

// ✅ RIGHT — use framework search / compartment APIs so filters apply
// e.g. mediator SearchCompartmentAsync / SearchResourceAsync with
// server-side parameters; do not strip compartment rewriters
```

When SMART fine-grained access is on, read paths may convert a get into a constrained search so the resource is only returned if it falls in the caller’s allowed set (`GetResourceHandler` follows this pattern). Preserve that behavior; do not short-circuit to an unconstrained `GetAsync` for “performance” without an equivalent check.

### Anti-patterns

- New search APIs that skip compartment/SMART rewriters
- Using admin/break-glass credentials in normal application flows
- Returning full search bundles to a patient-scoped client “because the UI will hide the rest”
- Hand-rolled SQL that joins resources without the same compartment predicates the product search uses

---

## 4. Carry audit context through all operations

### WHAT it is

`BundleResourceContext` (and related request context) carries provenance needed so **audit logging and bundle processing** know how a resource mutation was requested — including when the call is an inner entry of a transaction/batch bundle.

Controllers obtain context via `GetBundleResourceContext()` and put it on the mediator request. Handlers pass it into persistence through `ResourceWrapperOperation` on `IFhirDataStore.UpsertAsync`.

### WHY it matters

| Risk | What goes wrong |
|------|-----------------|
| Incomplete audit | Creates/updates happen with no reliable link to request/bundle context |
| Bundle integrity | Parallel transaction processing relies on context (e.g. persisted IDs) |
| Investigations | Security and clinical incident review need “who/what/when” without reading PHI from logs |
| Compliance | MidSizedClinic must show controlled, attributable access to ePHI |

Audit trails should answer operational questions using **identifiers and actions**, not by dumping resource bodies into log sinks.

### HOW it works (step-by-step)

1. Controller builds the request with `GetBundleResourceContext()` (standalone REST calls still pass context).
2. Handler receives `request.BundleResourceContext`.
3. On write, handler includes that context in `ResourceWrapperOperation`.
4. `IFhirDataStore.UpsertAsync` persists the resource; audit/bundle machinery can use the context.
5. Do not drop the context when wrapping, retrying, or forwarding inner bundle requests.

### Right vs wrong

```csharp
// ✅ RIGHT — controller attaches context (FhirController.Create)
_mediator.CreateResourceAsync(
    new CreateResourceRequest(
        resource.ToResourceElement(),
        GetBundleResourceContext()),
    HttpContext.RequestAborted);

// ✅ RIGHT — handler forwards context into the store
// CreateResourceHandler.HandleAsync
UpsertOutcome result = await FhirDataStore.UpsertAsync(
    new ResourceWrapperOperation(
        resourceWrapper,
        true,
        keepHistory,
        null,
        false,
        false,
        request.BundleResourceContext),  // audit / bundle context
    cancellationToken);

// ❌ WRONG — new request type or Upsert that omits context
await FhirDataStore.UpsertAsync(
    new ResourceWrapperOperation(
        resourceWrapper,
        true,
        keepHistory,
        null,
        false,
        false,
        bundleResourceContext: null),  // breaks audit / bundle semantics
    cancellationToken);
```

The lean rule shorthand `UpsertAsync(wrapper, bundleContext, ...)` means **always thread context into the store operation** — in this codebase that is the `BundleResourceContext` argument on `ResourceWrapperOperation`.

### Anti-patterns

- Constructing `CreateResourceRequest` / `UpsertResourceRequest` without the context the controller already has
- “Fire and forget” store writes from a background job with no request/audit context when one is required
- Catch/retry paths that rebuild `ResourceWrapperOperation` and silently pass `null` context
- Logging full resources “because audit didn’t fire” instead of fixing context propagation

---

## MidSizedClinic checklist

Before merging a change that touches handlers, logging, search, or fixtures:

1. **Logs** — only IDs, actions, statuses, correlation IDs; no names, MRNs, bodies, or clinical text.
2. **Fixtures** — referenced only from test projects; never from `src/` production paths.
3. **Compartments** — patient-scoped access uses server compartment/search; no unconstrained dumps.
4. **Audit context** — `BundleResourceContext` flows controller → request → `ResourceWrapperOperation` → store.

Lean reminder: [`.cursor/rules/FHIR-01-phi-safety.mdc`](../../../.cursor/rules/FHIR-01-phi-safety.mdc).
