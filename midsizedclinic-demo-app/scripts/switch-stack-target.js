/**
 * Switch demo app stack target: local (pre-demo) <-> dev (post-demo).
 *
 * Smart: detects WORKLIST_BACKEND (sql|fhir) from .env or code, then updates
 * the matching dependency endpoints. Always aligns FHIR_BASE_URL for seed.
 *
 * Usage: node scripts/switch-stack-target.js local|dev [--no-restart]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const demoDir = path.resolve(__dirname, '..');
const envPath = path.join(demoDir, '.env');
const repoRoot = path.resolve(demoDir, '..');

const TARGETS = {
  local: {
    demoTarget: 'local',
    label: 'pre-demo (local-setup)',
    fhirBaseUrl: 'http://localhost:8080',
    sqlPort: '1433',
    containers: 'pre-demo-fhir-api / pre-demo-sql',
  },
  dev: {
    demoTarget: 'dev',
    label: 'post-demo (Deploy to Dev)',
    fhirBaseUrl: 'http://localhost:8081',
    sqlPort: '1434',
    containers: 'post-demo-fhir-api / post-demo-sql',
  },
};

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function upsertEnv(text, updates) {
  const keys = Object.keys(updates);
  const seen = new Set();
  const lines = text.split(/\r?\n/);
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return line;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });
  for (const key of keys) {
    if (!seen.has(key)) next.push(`${key}=${updates[key]}`);
  }
  let body = next.join('\n');
  if (!body.endsWith('\n')) body += '\n';
  return body;
}

function detectWorklistBackend(env) {
  const explicit = String(env.WORKLIST_BACKEND || '').toLowerCase();
  if (explicit === 'sql' || explicit === 'fhir') {
    return { backend: explicit, how: '.env WORKLIST_BACKEND' };
  }

  const imagingPath = path.join(demoDir, 'routes', 'imaging.js');
  const imaging = fs.existsSync(imagingPath) ? fs.readFileSync(imagingPath, 'utf8') : '';
  if (/require\(['"]\.\.\/db\/imagingStudies['"]\)/.test(imaging)) {
    return { backend: 'sql', how: 'routes/imaging.js → db/imagingStudies (SQL)' };
  }
  if (/FHIR_BASE_URL|fhirClient|createFhir|\/metadata/.test(imaging) && /fetch\(|axios|got\(/.test(imaging)) {
    return { backend: 'fhir', how: 'routes/imaging.js → FHIR HTTP client' };
  }

  const htmlPath = path.join(demoDir, 'public', 'index.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  if (/Design:\s*FHIR/.test(html)) {
    return { backend: 'fhir', how: 'public/index.html Design: FHIR' };
  }
  if (/Design:\s*SQL/.test(html)) {
    return { backend: 'sql', how: 'public/index.html Design: SQL' };
  }

  return { backend: 'sql', how: 'default (current demo is SQL)' };
}

function healthUsesSql() {
  const serverPath = path.join(demoDir, 'server.js');
  const server = fs.existsSync(serverPath) ? fs.readFileSync(serverPath, 'utf8') : '';
  return /pingSql/.test(server);
}

function restartDemo() {
  const stop = path.join(repoRoot, '.cursor', 'skills', 'local-teardown', 'scripts', 'stop-demo-app.sh');
  const start = path.join(repoRoot, '.cursor', 'skills', 'local-setup', 'scripts', 'start-demo-app.sh');
  if (fs.existsSync(stop)) {
    spawnSync('bash', [stop], { cwd: repoRoot, stdio: 'inherit' });
  }
  // Prefer start-demo-app when bash/node available; seed is idempotent.
  if (fs.existsSync(start)) {
    const r = spawnSync('bash', [start], { cwd: repoRoot, stdio: 'inherit', env: process.env });
    if (r.status === 0) return;
  }
  console.warn('Could not restart via skill scripts; stop/start the demo app manually (npm start).');
}

function main() {
  const targetKey = String(process.argv[2] || '').toLowerCase();
  const noRestart = process.argv.includes('--no-restart');
  if (!TARGETS[targetKey]) {
    console.error('Usage: node scripts/switch-stack-target.js local|dev [--no-restart]');
    process.exit(1);
  }
  const target = TARGETS[targetKey];

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(path.join(demoDir, '.env.example'), envPath);
    console.log('created .env from .env.example');
  }

  const beforeText = fs.readFileSync(envPath, 'utf8');
  const env = parseEnv(beforeText);
  const { backend, how } = detectWorklistBackend(env);
  const sqlHealth = healthUsesSql();

  const updates = {
    DEMO_TARGET: target.demoTarget,
  };

  // Seed always uses FHIR HTTP against the chosen stack.
  updates.FHIR_BASE_URL = target.fhirBaseUrl;

  if (backend === 'sql') {
    updates.SQL_SERVER = env.SQL_SERVER || 'localhost';
    updates.SQL_PORT = target.sqlPort;
    console.log(`Worklist backend: SQL (${how}) → SQL_PORT=${target.sqlPort}`);
  } else {
    console.log(`Worklist backend: FHIR (${how}) → FHIR_BASE_URL=${target.fhirBaseUrl}`);
  }

  // /health still pings SQL today even when worklist is FHIR — keep SQL on the same stack.
  if (backend === 'fhir' && sqlHealth) {
    updates.SQL_PORT = target.sqlPort;
    updates.SQL_SERVER = env.SQL_SERVER || 'localhost';
    console.log(`Also updating SQL_PORT=${target.sqlPort} (/health uses pingSql)`);
  }

  if (!env.WORKLIST_BACKEND) {
    updates.WORKLIST_BACKEND = backend;
  }

  const afterText = upsertEnv(beforeText, updates);
  fs.writeFileSync(envPath, afterText, 'utf8');

  console.log(`Switched DEMO_TARGET=${target.demoTarget} (${target.label})`);
  console.log(`Expect containers: ${target.containers}`);
  console.log(`FHIR_BASE_URL=${updates.FHIR_BASE_URL}`);
  if (updates.SQL_PORT) console.log(`SQL_PORT=${updates.SQL_PORT}`);

  if (!noRestart) {
    console.log('Restarting demo app so .env takes effect...');
    restartDemo();
  } else {
    console.log('Skipped restart (--no-restart). Restart npm start yourself.');
  }
}

main();
