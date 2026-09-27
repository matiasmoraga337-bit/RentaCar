import type { Request, Response } from 'express';

import { sql } from '../database/sql.js';

export async function hasProviderAccess(
  pool: sql.ConnectionPool,
  providerId: number,
  userId: number,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;

  const result = await pool
    .request()
    .input('providerId', sql.Int, providerId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT 1
      FROM ProveedorUsuario
      WHERE ID_proveedor_proveedor_usuario = @providerId
        AND ID_usuario_proveedor_usuario = @userId;
    `);

  return result.recordset.length > 0;
}

export async function assertProviderAccess(
  request: Request,
  response: Response,
  pool: sql.ConnectionPool,
  providerId: number,
): Promise<boolean> {
  if (request.user?.roles.includes('ADMIN')) return true;

  const allowed = await hasProviderAccess(pool, providerId, request.user!.id, false);

  if (!allowed) {
    response.status(403).json({ message: 'No puedes acceder a este proveedor.' });
    return false;
  }

  return true;
}