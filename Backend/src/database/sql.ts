import sql from 'mssql';

import { env } from '../config/env.js';

const config: sql.config = {
  server: env.database.server,
  port: env.database.port,
  database: env.database.database,
  user: env.database.user,
  password: env.database.password,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export function getDatabasePool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const candidate = new sql.ConnectionPool(config).connect();
    candidate.catch(() => {
      if (poolPromise === candidate) {
        poolPromise = undefined;
      }
    });
    poolPromise = candidate;
  }
  return poolPromise;
}

export { sql };
