---
name: switch-app-to-dev
description: >-
  Points the MidSizedClinic imaging demo web app at the post-demo Deploy to Dev
  stack (FHIR :8081, SQL :1434). Smart: if the worklist uses SQL it updates
  SQL_PORT; if it uses the Fast Healthcare Interoperability Resources (FHIR)
  server it updates FHIR_BASE_URL. Use when the user says switch app to dev,
  point demo at post-demo, or use Deploy to Dev data.
disable-model-invocation: false
---

# Switch app to Dev (post-demo)

Retarget `midsizedclinic-demo-app` at **post-demo** (Deploy to Dev):

| | Value |
|--|--------|
| Containers | `post-demo-fhir-api`, `post-demo-sql` |
| FHIR | `http://localhost:8081` |
| SQL | `localhost:1434` |

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

## Smart behavior

Same detection as [switch-app-to-local](../switch-app-to-local/SKILL.md):

1. `.env` `WORKLIST_BACKEND=sql|fhir`
2. `routes/imaging.js` → SQL module ⇒ **sql**
3. FHIR HTTP client in imaging route ⇒ **fhir**
4. Design indicator in `public/index.html`
5. Default **sql**

Then updates:

| Backend | What changes |
|---------|----------------|
| **sql** | `SQL_PORT=1434` (and `DEMO_TARGET=dev`) |
| **fhir** | `FHIR_BASE_URL=http://localhost:8081` |
| Always | `FHIR_BASE_URL` for seed; `SQL_PORT` if `/health` uses `pingSql` |

Does **not** run Deploy to Dev — ensure post-demo is up via [deploy-to-dev](../deploy-to-dev/SKILL.md).

**Note:** post-demo SQL is a **separate** database from pre-demo. After switching to SQL mode on Dev, seed against Dev if the worklist is empty:

```bash
# FHIR_BASE_URL should already be :8081 after switch
cd midsizedclinic-demo-app && npm run seed
```

## Run

From repo root:

```bash
node midsizedclinic-demo-app/scripts/switch-stack-target.js dev
```

`--no-restart` updates `.env` only.

## Verify

```bash
# DEMO_TARGET=dev, SQL_PORT=1434, FHIR_BASE_URL=...8081
curl http://localhost:3000/health
curl http://localhost:8081/metadata
```

## Related

- Opposite: [switch-app-to-local](../switch-app-to-local/SKILL.md)
- Stacks: [deploy-to-dev](../deploy-to-dev/SKILL.md) · [local-setup](../local-setup/SKILL.md)
