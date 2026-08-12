/**
 * SQL connection pool for the MidSizedClinic imaging demo.
 *
 * Learning note: the real FHIR server injects ISqlConnectionBuilder / DI;
 * this demo reads credentials from .env and opens a single mssql pool.
 * Fail fast if env is missing — no retries (matches Docker dependency model).
 */

require('dotenv').config();
const sql = require('mssql');

let poolPromise;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and configure SQL_* values.`,
    );
  }
  return value;
}

function buildConfig() {
  return {
    server: requiredEnv('SQL_SERVER'),
    database: requiredEnv('SQL_DATABASE'),
    user: requiredEnv('SQL_USER'),
    password: requiredEnv('SQL_PASSWORD'),
    options: {
      encrypt: String(process.env.SQL_ENCRYPT || 'true').toLowerCase() === 'true',
      trustServerCertificate:
        String(process.env.SQL_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true',
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

/**
 * Returns a shared mssql ConnectionPool (created once).
 * @returns {Promise<sql.ConnectionPool>}
 */
function getPool() {
  if (!poolPromise) {
    const config = buildConfig();
    poolPromise = sql
      .connect(config)
      .then((pool) => {
        pool.on('error', (err) => {
          // Identifiers / connection errors only — never log query payloads (PHI risk).
          console.error('SQL pool error:', err.message);
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = undefined;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Lightweight connectivity check for /health.
 * @returns {Promise<boolean>}
 */
async function pingSql() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT 1 AS ok');
  return result.recordset?.[0]?.ok === 1;
}

module.exports = {
  sql,
  getPool,
  pingSql,
};
