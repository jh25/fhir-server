---
name: switch-app-to-local
description: >-
  Points the MidSizedClinic imaging demo web app at the pre-demo local stack
  (FHIR :8080, SQL :1433). Smart: if the worklist uses SQL it updates SQL_PORT;
  if it uses the Fast Healthcare Interoperability Resources (FHIR) server it
  updates FHIR_BASE_URL. Use when the user says switch app to local, point demo
  at pre-demo, or leave Deploy to Dev / post-demo.
disable-model-invocation: false
---

# Switch app to local (pre-demo)

Retarget `midsizedclinic-demo-app` at **pre-demo** (local-setup):

| | Value |
|--|--------|
| Containers | `pre-demo-fhir-api`, `pre-demo-sql` |
| FHIR | `http://localhost:8080` |
| SQL | `localhost:1433` |

On first mention, write **Fast Healthcare Interoperability Resources (FHIR)**
before using the acronym alone.

## Smart behavior

Detects worklist backend (in order):

1. `.env` `WORKLIST_BACKEND=sql|fhir`
2. `routes/imaging.js` → `db/imagingStudies` ⇒ **sql**
3. FHIR HTTP client in imaging route ⇒ **fhir**
4. `Design: SQL` / `Design: FHIR` in `public/index.html`
5. Default **sql**

Then updates:

| Backend | What changes |
|---------|----------------|
| **sql** | `SQL_PORT=1433` (and `DEMO_TARGET=local`) |
| **fhir** | `FHIR_BASE_URL=http://localhost:8080` |
| Always | `FHIR_BASE_URL` for seed alignment; `SQL_PORT` too if `/health` still uses `pingSql` |

Does **not** start/stop Docker stacks — ensure pre-demo is up via [local-setup](../local-setup/SKILL.md).

## Run

From repo root:

```bash
node midsizedclinic-demo-app/scripts/switch-stack-target.js local
```

`--no-restart` updates `.env` only (you restart `npm start`).

## Verify

```bash
# .env should show DEMO_TARGET=local, SQL_PORT=1433, FHIR_BASE_URL=...8080
curl http://localhost:3000/health   # sql:up when SQL mode / health ping
curl http://localhost:8080/metadata
```

## Related

- Opposite: [switch-app-to-dev](../switch-app-to-dev/SKILL.md)
- Stacks: [local-setup](../local-setup/SKILL.md) · [deploy-to-dev](../deploy-to-dev/SKILL.md)
