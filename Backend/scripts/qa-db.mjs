import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import sql from 'mssql';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const dbConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 4, min: 0, idleTimeoutMillis: 30000 },
};

const pool = await sql.connect(dbConfig);

try {
  console.log('QA BD bloque 1: cursor de reportes (sp_ReporteProveedores)');
  const reporte = await pool.request().execute('sp_ReporteProveedores');
  assert.ok(reporte.recordset.length > 0, 'El reporte con cursor debe retornar proveedores.');
  for (const fila of reporte.recordset) {
    assert.ok(
      Number(fila.cantidad_publicados) <= Number(fila.cantidad_vehiculos),
      `Publicados exceden vehiculos de ${fila.nombre_proveedor}.`,
    );
    assert.ok(Number(fila.cantidad_reservas) >= 0, `Reservas negativas en ${fila.nombre_proveedor}.`);
    assert.ok(Number(fila.total_pagado) >= 0, `Total pagado negativo en ${fila.nombre_proveedor}.`);
  }
  console.log(`  Cursor OK: ${reporte.recordset.length} proveedores con totales coherentes.`);

  console.log('QA BD bloque 2: proveedores empresa y persona');
  const tipos = await pool.request().execute('sp_ReporteTiposProveedor');
  const porTipo = new Map(tipos.recordset.map((fila) => [fila.nombre_tipo_proveedor, Number(fila.cantidad_proveedores)]));
  assert.ok((porTipo.get('EMPRESA') ?? 0) > 0, 'Debe existir al menos un proveedor EMPRESA.');
  assert.ok((porTipo.get('PERSONA') ?? 0) > 0, 'Debe existir al menos un proveedor PERSONA.');
  console.log(`  Tipos OK: EMPRESA=${porTipo.get('EMPRESA')}, PERSONA=${porTipo.get('PERSONA')}.`);

  console.log('\nQA integral de BD: OK');
} catch (error) {
  console.error('QA BD fallo:', error);
  process.exitCode = 1;
} finally {
  if (pool.connected) await pool.close();
}