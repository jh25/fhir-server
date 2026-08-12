# MidSizedClinic Imaging Demo App

Thin **Express.js** reference for **VERA-1042**: technician prior-study worklist via

`GET /Patient/{patientId}/ImagingStudy`

It reads **real `ImagingStudy` rows** from the same SQL Server database the Microsoft FHIR Server uses, and demonstrates MidSizedClinic conventions from **FHIR-10 … FHIR-13** (compartment search, roles, Bundle `searchset`, identifier-only audit).

This is a **learning tool**, not production code. The real contribution goes through MediatR handlers and `IFhirDataStore` in the .NET server.

**Clinic context:** [clinic-workflow.md](../.cursor/skills/product-owner-overview/clinic-workflow.md) — step 1 (tech retrieves prior studies).

---

## What this is

| Concern | This demo | Real FHIR server |
|---|---|---|
| HTTP → logic | Express route | Thin controller → MediatR handler (FHIR-00) |
| Persistence | Direct SQL on `dbo.Resource` + search-param tables | `IFhirDataStore` / generated SQL plans |
| Auth | `X-User-Role` header (`clinicTechnician` / `clinicRadiologist`) | `AuthorizationService` + roles.json / SMART |
| Audit | Console JSON (FHIR-13 shape, no PHI) | `BundleResourceContext` → audit pipeline |
| Response | FHIR Bundle `type=searchset` | Same FHIR REST contract |

---

## Prerequisites

1. FHIR SQL database running (Docker local-setup or VS local `FHIR` / `FHIR_R4`).
2. SQL port reachable from the host (**1433**). Stock compose does not publish it — use the overlay below.
3. Demo ImagingStudy data in SQL. With FHIR up on `:8080`:

```bash
cd midsizedclinic-demo-app
npm run seed
```

Creates (stable ids — safe to re-run):
- `Patient/pat-1001` — `stu-demo-us-1..3` (US) + `stu-demo-ct-1` (CT)
- `Patient/pat-1002` — `stu-demo-us-other` (US, compartment boundary)

`npm run seed` **checks first**: if all `stu-demo-*` studies and both patients already exist, it skips. After `docker compose down` (DB wipe), seed runs again. Force upsert with `SEED_FORCE=1 npm run seed`.

Note: `modality` search indexes `ImagingStudy.series.modality` (not root-only).

---

## How to run

### 1. Start FHIR + SQL (publish 1433)

From the **repo root**:

```bash
export SAPASSWORD=L0cal-Dev-Pwd1

docker compose \
  -f samples/docker/docker-compose.yaml \
  -f .cursor/skills/local-setup/docker-compose.local.yaml \
  -f midsizedclinic-demo-app/docker-compose.demo.yaml \
  up -d --build
```

On Windows PowerShell:

```powershell
$env:SAPASSWORD = "L0cal-Dev-Pwd1"

docker compose `
  -f samples/docker/docker-compose.yaml `
  -f .cursor/skills/local-setup/docker-compose.local.yaml `
  -f midsizedclinic-demo-app/docker-compose.demo.yaml `
  up -d --build
```

### 2. Configure env

```bash
cd midsizedclinic-demo-app
cp .env.example .env
# Edit .env if your SQL password / database name differs
```

VS local DB tip: set `SQL_DATABASE=FHIR_R4` (and auth) as needed.

### 3. Install and start

```bash
npm install
npm start
```

App listens on **http://localhost:3000**.

Open **http://localhost:3000/** for the worklist UI (table of ImagingStudy rows, role/patient/modality controls). The JSON API is unchanged underneath.

---

## Example curl commands

### Health (app + SQL)

```bash
curl -s http://localhost:3000/health
# {"status":"ok","sql":"up"}
```

### Successful worklist (technician)

```bash
curl -s "http://localhost:3000/Patient/pat-1001/ImagingStudy?modality=US&_sort=-started&_count=50" \
  -H "X-User-Role: clinicTechnician" \
  -H "X-User-Id: tech-1204"
```

Expect `resourceType: Bundle`, `type: searchset`, and `entry` ImagingStudy resources. Console prints a FHIR-13-shaped audit line (`outcome: success`).

### Denied — missing / invalid role (403)

```bash
curl -s -i "http://localhost:3000/Patient/pat-1001/ImagingStudy" \
  -H "X-User-Id: tech-1204"
```

Expect **403** and an `OperationOutcome`. Console audit: `outcome: denied`, `denialReason: invalid_or_missing_role`.

### Radiologist read (also allowed)

```bash
curl -s "http://localhost:3000/Patient/pat-1001/ImagingStudy" \
  -H "X-User-Role: clinicRadiologist" \
  -H "X-User-Id: rad-8841"
```

---

## Query parameters

| Param | Default | Notes |
|---|---|---|
| `modality` | _(none)_ | Token match on ImagingStudy modality code (e.g. `US`) |
| `_sort` | `-started` | `-started` (newest first) or `started` |
| `_count` | `50` | Clamped to max **100** (FHIR-11) |

---

## How SQL mapping works (teaching only)

1. Resolve `ResourceTypeId` / `SearchParamId` by name/URI (cached).
2. Join `dbo.ReferenceSearchParam` (`clinical-patient`) for compartment.
3. Optional `dbo.TokenSearchParam` for `modality`.
4. Order by `dbo.DateTimeSearchParam` (`started`).
5. Gunzip `dbo.Resource.RawResource` → FHIR JSON → Bundle entries.

Do **not** copy this pattern into Core/API production code — use `IFhirDataStore`.

---

## Rules referenced

- [FHIR-10](../.cursor/rules/FHIR-10-midsizedclinic-imaging-api-patterns.mdc) — compartment API, roles, Bundle
- [FHIR-11](../.cursor/rules/FHIR-11-midsizedclinic-imaging-search-patterns.mdc) — modality, `_sort=-started`, `_count`
- [FHIR-12](../.cursor/rules/FHIR-12-midsizedclinic-imaging-workflow-patterns.mdc) — tech / radiologist workflow
- [FHIR-13](../.cursor/rules/FHIR-13-midsizedclinic-imaging-audit-compliance.mdc) — audit identifiers only
