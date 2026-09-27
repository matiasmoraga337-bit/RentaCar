import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';

import { env } from '../config/env.js';
import { sql, getDatabasePool } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/mail.js';

const router = Router();

const dummyPasswordHash = bcrypt.hash(randomBytes(16).toString('hex'), 12);

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
  return jwt.sign({ id, roles }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'],
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashVerificationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

function sessionMetadata(request: Request) {
  return {
    userAgent: String(request.headers['user-agent'] ?? '').slice(0, 255) || null,
    ip: String(request.ip ?? '').slice(0, 45) || null,
  };
}

async function issueSession(
  pool: sql.ConnectionPool,
  userId: number,
  request: Request,
): Promise<string> {
  const refreshToken = newRefreshToken();
  const { userAgent, ip } = sessionMetadata(request);
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('tokenHash', sql.Char(64), hashSessionToken(refreshToken))
    .input('expiresAt', sql.DateTime2, new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000))
    .input('userAgent', sql.NVarChar(255), userAgent)
    .input('ip', sql.VarChar(45), ip)
    .query(`
      INSERT INTO Sesion
      (
        ID_usuario_sesion,
        refresh_token_hash_sesion,
        fecha_expiracion_sesion,
        user_agent_sesion,
        ip_origen_sesion
      )
      VALUES (@userId, @tokenHash, @expiresAt, @userAgent, @ip);
    `);
  return refreshToken;
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
  const verificationToken = randomBytes(32).toString('hex');

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

    await transaction
      .request()
      .input('userId', sql.Int, idUsuario)
      .input('tokenHash', sql.Char(64), hashVerificationToken(verificationToken))
      .input('expiresAt', sql.DateTime2, new Date(Date.now() + 24 * 60 * 60 * 1000))
      .query(`
        INSERT INTO EmailVerificacion
        (
          ID_usuario_email_verificacion,
          token_hash_email_verificacion,
          fecha_expiracion_email_verificacion
        )
        VALUES (@userId, @tokenHash, @expiresAt);
      `);

    await transaction.commit();
    transactionActive = false;

    try {
      await sendVerificationEmail(email, nombres, verificationToken);
    } catch (mailError) {
      console.error('No fue posible enviar el correo de confirmacion.', mailError);
    }

    response.status(201).json({
      message: 'Cuenta creada. Revisa tu correo para confirmarla.',
      requiresVerification: true,
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
          u.email_confirmado_usuario,
          r.nombre_rol
        FROM Usuario u
        LEFT JOIN UsuarioRol ur ON ur.ID_usuario_usuario_rol = u.ID_usuario
        LEFT JOIN Rol r ON r.ID_rol = ur.ID_rol_usuario_rol
        WHERE u.email_usuario = @email;
      `);

    const user = result.recordset[0];

    if (!user || !user.activo_usuario) {
      await bcrypt.compare(password, await dummyPasswordHash);
      response.status(401).json({ message: 'Credenciales invalidas.' });
      return;
    }

    if (!user.email_confirmado_usuario) {
      await bcrypt.compare(password, await dummyPasswordHash);
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

    const refreshToken = await issueSession(pool, user.ID_usuario, request);

    response.json({
      token: createToken(user.ID_usuario, roles),
      refreshToken,
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

router.post('/refresh', async (request, response, next) => {
  const refreshToken = typeof request.body?.refreshToken === 'string'
    ? request.body.refreshToken
    : '';

  if (!/^[a-f0-9]{64}$/.test(refreshToken)) {
    response.status(401).json({ message: 'Sesion invalida o expirada.' });
    return;
  }

  const pool = await getDatabasePool();
  const transaction = new sql.Transaction(pool);
  let transactionActive = false;
  const oldHash = hashSessionToken(refreshToken);
  const rotatedRefreshToken = newRefreshToken();
  const newHash = hashSessionToken(rotatedRefreshToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  try {
    await transaction.begin();
    transactionActive = true;
    const { userAgent, ip } = sessionMetadata(request);

    const result = await transaction
      .request()
      .input('oldHash', sql.Char(64), oldHash)
      .input('newHash', sql.Char(64), newHash)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('userAgent', sql.NVarChar(255), userAgent)
      .input('ip', sql.VarChar(45), ip)
      .query(`
        DECLARE @userId INT;

        SELECT TOP 1 @userId = ID_usuario_sesion
        FROM Sesion
        WHERE refresh_token_hash_sesion = @oldHash
          AND fecha_revocacion_sesion IS NULL
          AND fecha_expiracion_sesion > SYSDATETIME();

        IF @userId IS NULL
        BEGIN
          SELECT 0 AS affected;
        END
        ELSE
        BEGIN
          UPDATE Sesion
          SET fecha_revocacion_sesion = SYSDATETIME(),
              ultimo_uso_sesion = SYSDATETIME()
          WHERE refresh_token_hash_sesion = @oldHash;

          INSERT INTO Sesion
          (
            ID_usuario_sesion,
            refresh_token_hash_sesion,
            fecha_expiracion_sesion,
            user_agent_sesion,
            ip_origen_sesion
          )
          VALUES (@userId, @newHash, @expiresAt, @userAgent, @ip);

          SELECT 1 AS affected, @userId AS ID_usuario;
        END
      `);

    const row = result.recordset[0];

    if (!row || row.affected !== 1) {
      await transaction.rollback();
      transactionActive = false;
      response.status(401).json({ message: 'Sesion invalida o expirada.' });
      return;
    }

    await transaction.commit();
    transactionActive = false;

    const roleResult = await pool
      .request()
      .input('userId', sql.Int, row.ID_usuario)
      .query(`
        SELECT r.nombre_rol
        FROM UsuarioRol ur
        INNER JOIN Rol r ON r.ID_rol = ur.ID_rol_usuario_rol
        WHERE ur.ID_usuario_usuario_rol = @userId;
      `);
    const roles = roleResult.recordset
      .map((r: { nombre_rol: string | null }) => r.nombre_rol)
      .filter((role: string | null): role is string => typeof role === 'string');

    response.json({
      token: createToken(row.ID_usuario, roles),
      refreshToken: rotatedRefreshToken,
    });
  } catch (error) {
    if (transactionActive) {
      await transaction.rollback().catch(() => undefined);
    }
    next(error);
  }
});

router.post('/logout', async (request, response, next) => {
  const refreshToken = typeof request.body?.refreshToken === 'string'
    ? request.body.refreshToken
    : '';

  try {
    if (/^[a-f0-9]{64}$/.test(refreshToken)) {
      const pool = await getDatabasePool();
      await pool
        .request()
        .input('tokenHash', sql.Char(64), hashSessionToken(refreshToken))
        .query(`
          UPDATE Sesion
          SET fecha_revocacion_sesion = SYSDATETIME()
          WHERE refresh_token_hash_sesion = @tokenHash
            AND fecha_revocacion_sesion IS NULL;
        `);
    }

    response.json({ message: 'Sesion cerrada.' });
  } catch (error) {
    next(error);
  }
});

router.get('/confirmar-cuenta', async (request, response, next) => {
  const token = typeof request.query.token === 'string' ? request.query.token : '';

  if (!/^[a-f0-9]{64}$/.test(token)) {
    response.status(400).json({ message: 'Token de confirmacion invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('tokenHash', sql.Char(64), hashVerificationToken(token))
      .query(`
        DECLARE @userId INT;

        SELECT @userId = ID_usuario_email_verificacion
        FROM EmailVerificacion
        WHERE token_hash_email_verificacion = @tokenHash
          AND fecha_uso_email_verificacion IS NULL
          AND fecha_expiracion_email_verificacion > SYSDATETIME();

        IF @userId IS NULL
        BEGIN
          SELECT 0 AS affected;
        END
        ELSE
        BEGIN
          UPDATE Usuario
          SET email_confirmado_usuario = 1
          WHERE ID_usuario = @userId;

          UPDATE EmailVerificacion
          SET fecha_uso_email_verificacion = SYSDATETIME()
          WHERE token_hash_email_verificacion = @tokenHash;

          SELECT 1 AS affected;
        END
      `);

    if (result.recordset[0]?.affected !== 1) {
      response.status(400).json({ message: 'El enlace es invalido, ya fue usado o expiro.' });
      return;
    }

    response.json({ message: 'Correo confirmado. Ya puedes iniciar sesion.' });
  } catch (error) {
    next(error);
  }
});

router.post('/reenviar-confirmacion', async (request, response, next) => {
  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';

  if (!isValidEmail(email)) {
    response.status(400).json({ message: 'Correo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const userResult = await pool
      .request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 u.ID_usuario, u.email_confirmado_usuario,
          p.nombres_persona
        FROM Usuario u
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        WHERE u.email_usuario = @email;
      `);
    const user = userResult.recordset[0];

    if (user && !user.email_confirmado_usuario) {
      const verificationToken = randomBytes(32).toString('hex');
      await pool
        .request()
        .input('userId', sql.Int, user.ID_usuario)
        .input('tokenHash', sql.Char(64), hashVerificationToken(verificationToken))
        .input('expiresAt', sql.DateTime2, new Date(Date.now() + 24 * 60 * 60 * 1000))
        .query(`
          INSERT INTO EmailVerificacion
          (
            ID_usuario_email_verificacion,
            token_hash_email_verificacion,
            fecha_expiracion_email_verificacion
          )
          VALUES (@userId, @tokenHash, @expiresAt);
        `);
      await sendVerificationEmail(email, user.nombres_persona, verificationToken);
    }

    response.json({ message: 'Si la cuenta requiere confirmacion, recibiras un correo.' });
  } catch (error) {
    next(error);
  }
});

router.post('/solicitar-recuperacion', async (request, response, next) => {
  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';

  if (!isValidEmail(email)) {
    response.status(400).json({ message: 'Correo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('email', sql.VarChar(150), email)
      .query(`
        SELECT TOP 1 u.ID_usuario, p.nombres_persona
        FROM Usuario u
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        WHERE u.email_usuario = @email
          AND u.activo_usuario = 1;
      `);
    const user = result.recordset[0];

    if (user) {
      const token = randomBytes(32).toString('hex');
      await pool.request()
        .input('userId', sql.Int, user.ID_usuario)
        .input('tokenHash', sql.Char(64), hashVerificationToken(token))
        .input('expiresAt', sql.DateTime2, new Date(Date.now() + 60 * 60 * 1000))
        .query(`
          INSERT INTO PasswordResetToken
          (
            ID_usuario_password_reset,
            token_hash_password_reset,
            fecha_expiracion_password_reset
          )
          VALUES (@userId, @tokenHash, @expiresAt);
        `);
      try {
        await sendPasswordResetEmail(email, user.nombres_persona, token);
      } catch (mailError) {
        console.error('No fue posible enviar el correo de recuperacion.', mailError);
      }
    }

    response.json({ message: 'Si el correo existe, recibiras instrucciones para recuperar tu cuenta.' });
  } catch (error) {
    next(error);
  }
});

router.post('/restablecer-contrasena', async (request, response, next) => {
  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';

  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8) {
    response.status(400).json({ message: 'Token invalido o contraseña demasiado corta.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.request()
      .input('tokenHash', sql.Char(64), hashVerificationToken(token))
      .input('passwordHash', sql.VarChar(255), passwordHash)
      .query(`
        DECLARE @userId INT;
        SELECT @userId = ID_usuario_password_reset
        FROM PasswordResetToken
        WHERE token_hash_password_reset = @tokenHash
          AND fecha_uso_password_reset IS NULL
          AND fecha_expiracion_password_reset > SYSDATETIME();

        IF @userId IS NULL
        BEGIN
          SELECT 0 AS affected;
        END
        ELSE
        BEGIN
          UPDATE Usuario SET password_hash_usuario = @passwordHash WHERE ID_usuario = @userId;
          UPDATE Sesion SET fecha_revocacion_sesion = SYSDATETIME() WHERE ID_usuario_sesion = @userId AND fecha_revocacion_sesion IS NULL;
          UPDATE PasswordResetToken SET fecha_uso_password_reset = SYSDATETIME() WHERE token_hash_password_reset = @tokenHash;
          SELECT 1 AS affected;
        END
      `);

    if (result.recordset[0]?.affected !== 1) {
      response.status(400).json({ message: 'El enlace es invalido, ya fue usado o expiro.' });
      return;
    }

    response.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesion.' });
  } catch (error) {
    next(error);
  }
});

router.post('/cambiar-contrasena', authenticateToken, async (request, response, next) => {
  const actualPassword = typeof request.body?.actualPassword === 'string'
    ? request.body.actualPassword
    : '';
  const nuevaPassword = typeof request.body?.nuevaPassword === 'string'
    ? request.body.nuevaPassword
    : '';

  if (!actualPassword || !nuevaPassword || nuevaPassword.length < 8 || nuevaPassword === actualPassword) {
    response.status(400).json({ message: 'Contrasena actual invalida o nueva contrasena debil.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const userResult = await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT password_hash_usuario
        FROM Usuario
        WHERE ID_usuario = @userId;
      `);
    const user = userResult.recordset[0];

    if (!user) {
      response.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(actualPassword, user.password_hash_usuario);

    if (!passwordMatches) {
      response.status(400).json({ message: 'La contrasena actual es incorrecta.' });
      return;
    }

    const newHash = await bcrypt.hash(nuevaPassword, 12);

    await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .input('hash', sql.VarChar(255), newHash)
      .query(`
        UPDATE Usuario
        SET password_hash_usuario = @hash
        WHERE ID_usuario = @userId;

        UPDATE Sesion
        SET fecha_revocacion_sesion = SYSDATETIME()
        WHERE ID_usuario_sesion = @userId
          AND fecha_revocacion_sesion IS NULL;
      `);

    response.json({ message: 'Contrasena actualizada. Vuelve a iniciar sesion.' });
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
           p.apellido_materno_persona,
           p.telefono_persona
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

router.patch('/perfil', authenticateToken, async (request, response, next) => {
  const body = request.body as {
    nombres?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string | null;
    telefono?: string | null;
  };
  const nombres = body.nombres?.trim();
  const apellidoPaterno = body.apellidoPaterno?.trim();

  if (!nombres || !apellidoPaterno) {
    response.status(400).json({ message: 'Nombres y apellido paterno son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .input('nombres', sql.NVarChar(80), nombres)
      .input('apellidoPaterno', sql.NVarChar(50), apellidoPaterno)
      .input('apellidoMaterno', sql.NVarChar(50), body.apellidoMaterno?.trim() || null)
      .input('telefono', sql.VarChar(20), body.telefono?.trim() || null)
      .query(`
        UPDATE p
        SET nombres_persona = @nombres,
            apellido_paterno_persona = @apellidoPaterno,
            apellido_materno_persona = @apellidoMaterno,
            telefono_persona = @telefono
        FROM Persona p
        INNER JOIN Usuario u ON u.ID_persona_usuario = p.ID_persona
        WHERE u.ID_usuario = @userId;
      `);

    response.json({ message: 'Perfil actualizado.' });
  } catch (error) {
    next(error);
  }
});

export default router;
