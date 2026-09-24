import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

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
