import dotenv from 'dotenv';
import sql from 'mssql';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const FRESH = process.argv.includes('--fresh');
const DB_NAME = process.env.DB_NAME ?? 'RentaCarDB';
const SCHEMA_FILE = fileURLToPath(new URL('../../RentaCarDB.sql', import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

const baseConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT ?? 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 2, min: 0, idleTimeoutMillis: 30000 },
};

let pool = null;

async function connect(database) {
  return sql.connect({ ...baseConfig, database });
}

function splitBatches(text) {
  return text
    .split(/^\s*GO\s*(?:--.*)?$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function runBatches(batches, label) {
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const switchMatch = batch.match(/^USE\s+\[?(\w+)\]?;?$/i);

    if (switchMatch) {
      const target = switchMatch[1];
      console.log(`  batch ${index + 1}: cambiar a base ${target}`);
      await pool.close();
      pool = await connect(target);
      continue;
    }

    await pool.request().batch(batch);
  }
  console.log(`  ${label}: ${batches.length} lotes ejecutados.`);
}

async function databaseExists() {
  const { recordset } = await pool.request()
    .input('nombre', sql.NVarChar(128), DB_NAME)
    .query('SELECT COUNT(*) AS existe FROM sys.databases WHERE name = @nombre');
  return Number(recordset[0].existe) > 0;
}

async function dropDatabase() {
  console.log(`  Eliminando base ${DB_NAME} existente...`);
  await pool.request().batch(`
ALTER DATABASE [${DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE [${DB_NAME}];
`);
}

function tableCount() {
  return pool.request().query(
    'SELECT COUNT(*) AS cantidad FROM sys.tables WHERE is_ms_shipped = 0;',
  );
}

try {
  if (!process.env.DB_SERVER || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error(
      'Faltan variables de conexion (DB_SERVER, DB_USER, DB_PASSWORD). Copia .env.example como .env.',
    );
  }

  pool = await connect('master');
  const exists = await databaseExists();

  if (exists && !FRESH) {
    throw new Error(
      `La base ${DB_NAME} ya existe y no se paso --fresh. Usa "npm run db:setup -- --fresh" para recrearla.`,
    );
  }

  if (exists && FRESH) {
    await dropDatabase();
  }

  console.log(`Ejecutando ${SCHEMA_FILE}...`);
  const schema = readFileSync(SCHEMA_FILE, 'utf8');
  await runBatches(splitBatches(schema), 'Esquema');

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.*\.sql$/i.test(file))
    .sort();

  if (migrations.length === 0) {
    throw new Error(`No se encontraron migraciones en ${MIGRATIONS_DIR}.`);
  }

  for (const file of migrations) {
    console.log(`Ejecutando migracion ${file}...`);
    const text = readFileSync(fileURLToPath(new URL(`../../migrations/${file}`, import.meta.url)), 'utf8');
    await runBatches(splitBatches(text), file);
  }

  const { recordset } = await tableCount();
  const tables = Number(recordset[0].cantidad);
  console.log(`\nBase ${DB_NAME} lista con ${tables} tablas.`);
  console.log('Siguiente paso: npm run seed:demo (datos de demostracion).');
} catch (error) {
  console.error('Setup de base de datos fallo:', error.message ?? error);
  process.exitCode = 1;
} finally {
  if (pool?.connected) await pool.close();
}