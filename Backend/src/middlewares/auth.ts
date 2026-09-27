import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { getDatabasePool, sql } from '../database/sql.js';

export interface AuthenticatedUser {
  id: number;
  roles: string[];
}

export function authenticateToken(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    response.status(401).json({ message: 'Token de autenticacion requerido.' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (typeof payload === 'string' || typeof payload.id !== 'number') {
      response.status(401).json({ message: 'Token invalido.' });
      return;
    }

    request.user = {
      id: payload.id,
      roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
    };
    next();
  } catch {
    response.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const roles = request.user?.roles ?? [];
    const hasPermission = roles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      response.status(403).json({ message: 'No tienes permisos para esta operacion.' });
      return;
    }

    next();
  };
}

export function requireFreshRoles(...allowedRoles: string[]) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const pool = await getDatabasePool();
      const result = await pool
        .request()
        .input('userId', sql.Int, request.user!.id)
        .query(`
          SELECT u.activo_usuario, r.nombre_rol
          FROM Usuario u
          LEFT JOIN UsuarioRol ur
            ON ur.ID_usuario_usuario_rol = u.ID_usuario
          LEFT JOIN Rol r
            ON r.ID_rol = ur.ID_rol_usuario_rol
          WHERE u.ID_usuario = @userId;
        `);

      const rows = result.recordset;

      if (rows.length === 0 || !rows[0].activo_usuario) {
        response.status(401).json({ message: 'Sesion invalida o usuario desactivado.' });
        return;
      }

      const roles = rows
        .map((row: { nombre_rol: string | null }) => row.nombre_rol)
        .filter((role: string | null): role is string => typeof role === 'string');

      const hasPermission = roles.some((role) => allowedRoles.includes(role));

      if (!hasPermission) {
        response.status(403).json({ message: 'No tienes permisos para esta operacion.' });
        return;
      }

      request.user!.roles = roles;
      next();
    } catch (error) {
      next(error);
    }
  };
}
