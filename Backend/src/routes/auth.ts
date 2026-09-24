import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { sql, getDatabasePool } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

interface RegisterBody {
  rut?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  email?: string;
  password?: string;
  telefono?: string;
}

function createToken(id: number, roles: string[]): string {
  return jwt.sign({ id, roles }, env.jwtSecret, { expiresIn: '2h' });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/registro', async (request, response, next) => {
  const body = request.body as RegisterBody;
  const rut = body.rut?.trim();
  const nombres = body.nombres?.trim();
  const apellidoPaterno = body.apellidoPaterno?.trim();
  const apellidoMaterno = body.apellidoMaterno?.trim() || null;
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const telefono = body.telefono?.trim() || null;

  if (
    !rut ||
    !nombres ||
    !apellidoPaterno ||
    !email ||
    !password ||
    !isValidEmail(email) ||
    password.length < 8
  ) {
    response.status(400).json({
      message: 'Datos invalidos. Revisa correo, campos obligatorios y contrasena.',
    });
    return;
  }

  const pool = await getDatabasePool();
  const transaction = new sql.Transaction(pool);
  let transactionActive = false;

  try {
    await transaction.begin();
    transactionActive = true;

    const existingUser = await transaction
      .request()
      .input('email', sql.VarChar(150), email)
      .input('rut', sql.VarChar(12), rut)
      .query(`
        SELECT TOP 1 u.ID_usuario
        FROM Usuario u
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        WHERE u.email_usuario = @email OR p.rut_persona = @rut;
      `);

    if (existingUser.recordset.length > 0) {
      await transaction.rollback();
      response.status(409).json({ message: 'El correo o RUT ya esta registrado.' });
      return;
    }

    const personResult = await transaction
      .request()
      .input('rut', sql.VarChar(12), rut)
      .input('nombres', sql.NVarChar(80), nombres)
      .input('apellidoPaterno', sql.NVarChar(50), apellidoPaterno)
      .input('apellidoMaterno', sql.NVarChar(50), apellidoMaterno)
      .input('telefono', sql.VarChar(20), telefono)
      .query(`
        INSERT INTO Persona
        (
          rut_persona,
          nombres_persona,
          apellido_paterno_persona,
          apellido_materno_persona,
          telefono_persona
        )
        OUTPUT INSERTED.ID_persona
        VALUES
        (
          @rut,
          @nombres,
          @apellidoPaterno,
          @apellidoMaterno,
          @telefono
        );
      `);

    const idPersona = personResult.recordset[0].ID_persona as number;
    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await transaction
      .request()
      .input('idPersona', sql.Int, idPersona)
      .input('email', sql.VarChar(150), email)
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .query(`
        INSERT INTO Usuario
        (
          ID_persona_usuario,
          email_usuario,
          password_hash_usuario
        )
        OUTPUT INSERTED.ID_usuario
        VALUES (@idPersona, @email, @passwordHash);
      `);

    const idUsuario = userResult.recordset[0].ID_usuario as number;

    const roleResult = await transaction
      .request()
      .query(`
        SELECT ID_rol
        FROM Rol
        WHERE nombre_rol = 'CLIENTE';
      `);

    const idRole = roleResult.recordset[0]?.ID_rol as number | undefined;

    if (!idRole) {
      throw new Error('El rol CLIENTE no existe en la base de datos.');
    }

    await transaction
      .request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('idRol', sql.Int, idRole)
      .query(`
        INSERT INTO UsuarioRol
        (
          ID_usuario_usuario_rol,
          ID_rol_usuario_rol
        )
        VALUES (@idUsuario, @idRol);
      `);

    await transaction
      .request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        INSERT INTO Cliente(ID_usuario_cliente)
        VALUES (@idUsuario);
      `);

    await transaction.commit();
    transactionActive = false;

    response.status(201).json({
      message: 'Usuario registrado correctamente.',
      token: createToken(idUsuario, ['CLIENTE']),
      user: {
        id: idUsuario,
        email,
        roles: ['CLIENTE'],
      },
    });
  } catch (error) {
    if (transactionActive) {
      await transaction.rollback().catch(() => undefined);
    }
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';
  const password = typeof request.body?.password === 'string'
    ? request.body.password
    : '';

  if (!email || !password) {
    response.status(400).json({ message: 'Correo y contrasena son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT
          u.ID_usuario,
          u.email_usuario,
          u.password_hash_usuario,
          u.activo_usuario,
          r.nombre_rol
        FROM Usuario u
        LEFT JOIN UsuarioRol ur ON ur.ID_usuario_usuario_rol = u.ID_usuario
        LEFT JOIN Rol r ON r.ID_rol = ur.ID_rol_usuario_rol
        WHERE u.email_usuario = @email;
      `);

    const user = result.recordset[0];

    if (!user || !user.activo_usuario) {
      response.status(401).json({ message: 'Credenciales invalidas.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash_usuario);

    if (!passwordMatches) {
      response.status(401).json({ message: 'Credenciales invalidas.' });
      return;
    }

    const roles = result.recordset
      .map((row: { nombre_rol: string | null }) => row.nombre_rol)
      .filter((role: string | null): role is string => typeof role === 'string');

    response.json({
      token: createToken(user.ID_usuario, roles),
      user: {
        id: user.ID_usuario,
        email: user.email_usuario,
        roles,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/perfil', authenticateToken, async (request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('idUsuario', sql.Int, request.user!.id)
      .query(`
        SELECT
          u.ID_usuario,
          u.email_usuario,
          u.activo_usuario,
          p.rut_persona,
          p.nombres_persona,
          p.apellido_paterno_persona,
          p.apellido_materno_persona
        FROM Usuario u
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        WHERE u.ID_usuario = @idUsuario;
      `);

    const user = result.recordset[0];

    if (!user) {
      response.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    response.json({ user, roles: request.user!.roles });
  } catch (error) {
    next(error);
  }
});

export default router;
