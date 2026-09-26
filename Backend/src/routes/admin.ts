import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { sendProviderStatusEmail } from '../services/mail.js';

const router = Router();

router.use(authenticateToken, requireRoles('ADMIN'));

function parseId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/resumen', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const [totalsResult, providersBreakdown, publicationsBreakdown, reservationsBreakdown] = await Promise.all([
      pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM Usuario) AS total_usuarios,
          (SELECT COUNT(*) FROM Proveedor) AS total_proveedores,
          (SELECT COUNT(*) FROM Vehiculo) AS total_vehiculos,
          (SELECT COUNT(*) FROM Reserva) AS total_reservas,
          (SELECT ISNULL(SUM(monto_pago), 0) FROM Pago WHERE ID_estado_pago_pago =
            (SELECT ID_estado_pago FROM EstadoPago WHERE nombre_estado_pago = 'APROBADO')) AS ingresos_simulados;
      `),
      pool.request().query(`
        SELECT
          ep.nombre_estado_proveedor AS concepto,
          COUNT(p.ID_proveedor) AS cantidad
        FROM Proveedor p
        INNER JOIN EstadoProveedor ep
          ON ep.ID_estado_proveedor = p.ID_estado_proveedor_proveedor
        GROUP BY ep.nombre_estado_proveedor;
      `),
      pool.request().query(`
        SELECT
          epv.nombre_estado_publicacion_vehiculo AS concepto,
          COUNT(v.ID_vehiculo) AS cantidad
        FROM Vehiculo v
        INNER JOIN EstadoPublicacionVehiculo epv
          ON epv.ID_estado_publicacion_vehiculo = v.ID_estado_publicacion_vehiculo_vehiculo
        GROUP BY epv.nombre_estado_publicacion_vehiculo;
      `),
      pool.request().query(`
        SELECT
          er.nombre_estado_reserva AS concepto,
          COUNT(re.ID_reserva) AS cantidad
        FROM Reserva re
        INNER JOIN EstadoReserva er
          ON er.ID_estado_reserva = re.ID_estado_reserva_reserva
        GROUP BY er.nombre_estado_reserva;
      `),
    ]);

    response.json({
      totals: totalsResult.recordset[0],
      proveedores: providersBreakdown.recordset,
      publicaciones: publicationsBreakdown.recordset,
      reservas: reservationsBreakdown.recordset,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/proveedores', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().query(`
      SELECT
        p.ID_proveedor,
        p.nombre_comercial_proveedor,
        p.razon_social_proveedor,
        p.rut_proveedor,
        p.telefono_proveedor,
        p.email_proveedor,
        p.fecha_registro_proveedor,
        tp.nombre_tipo_proveedor,
        ep.nombre_estado_proveedor,
        (
          SELECT COUNT(*)
          FROM Vehiculo v
          WHERE v.ID_proveedor_vehiculo = p.ID_proveedor
        ) AS total_vehiculos,
        (
          SELECT COUNT(*)
          FROM SedeProveedor s
          WHERE s.ID_proveedor_sede_proveedor = p.ID_proveedor
        ) AS total_sedes
      FROM Proveedor p
      INNER JOIN TipoProveedor tp
        ON tp.ID_tipo_proveedor = p.ID_tipo_proveedor_proveedor
      INNER JOIN EstadoProveedor ep
        ON ep.ID_estado_proveedor = p.ID_estado_proveedor_proveedor
      ORDER BY p.fecha_registro_proveedor DESC;
    `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/vehiculos', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().query(`
      SELECT
        v.ID_vehiculo,
        v.patente_vehiculo,
        v.vin_vehiculo,
        v.anio_vehiculo,
        v.kilometraje_vehiculo,
        v.precio_diario_base_vehiculo,
        v.fecha_registro_vehiculo,
        p.nombre_comercial_proveedor,
        ma.nombre_marca,
        mo.nombre_modelo,
        tv.nombre_tipo_vehiculo,
        ev.nombre_estado_vehiculo,
        epv.nombre_estado_publicacion_vehiculo
      FROM Vehiculo v
      INNER JOIN Proveedor p
        ON p.ID_proveedor = v.ID_proveedor_vehiculo
      INNER JOIN Modelo mo
        ON mo.ID_modelo = v.ID_modelo_vehiculo
      INNER JOIN Marca ma
        ON ma.ID_marca = mo.ID_marca_modelo
      INNER JOIN TipoVehiculo tv
        ON tv.ID_tipo_vehiculo = v.ID_tipo_vehiculo_vehiculo
      INNER JOIN EstadoVehiculo ev
        ON ev.ID_estado_vehiculo = v.ID_estado_vehiculo_vehiculo
      INNER JOIN EstadoPublicacionVehiculo epv
        ON epv.ID_estado_publicacion_vehiculo = v.ID_estado_publicacion_vehiculo_vehiculo
      ORDER BY v.fecha_registro_vehiculo DESC;
    `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/reservas', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().query(`
      SELECT *
      FROM vw_ReservasDetalle
      ORDER BY fecha_inicio_reserva DESC;
    `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/reportes/proveedores', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().execute('sp_ReporteProveedores');
    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/reportes/tipos-proveedor', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().execute('sp_ReporteTiposProveedor');
    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/auditoria', async (request, response, next) => {
  const table = typeof request.query.tabla === 'string' && request.query.tabla.trim()
    ? request.query.tabla.trim().toUpperCase()
    : null;
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 20));

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('table', sql.VarChar(100), table)
      .input('page', sql.Int, page)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        DECLARE @total INT;

        SELECT @total = COUNT(*)
        FROM Auditoria a
        WHERE (@table IS NULL OR a.tabla_afectada_auditoria = @table);

        SELECT
          a.ID_auditoria,
          a.tabla_afectada_auditoria,
          a.ID_registro_auditoria,
          a.accion_auditoria,
          a.valor_anterior_auditoria,
          a.valor_nuevo_auditoria,
          a.fecha_hora_auditoria,
          a.descripcion_auditoria,
          COALESCE(CONCAT(pe.nombres_persona, ' ', pe.apellido_paterno_persona), 'Sistema')
            AS nombre_usuario,
          u.email_usuario
        FROM Auditoria a
        LEFT JOIN Usuario u
          ON u.ID_usuario = a.ID_usuario_auditoria
        LEFT JOIN Persona pe
          ON pe.ID_persona = u.ID_persona_usuario
        WHERE (@table IS NULL OR a.tabla_afectada_auditoria = @table)
        ORDER BY a.ID_auditoria DESC
        OFFSET (@page - 1) * @pageSize ROWS
        FETCH NEXT @pageSize ROWS ONLY;

        SELECT @total AS total;
      `);

    const recordsets = Array.isArray(result.recordsets) ? result.recordsets : Object.values(result.recordsets);
    const items = recordsets[0];
    const total = recordsets[1]?.[0]?.total ?? 0;

    response.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/usuarios', async (request, response, next) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 20));

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('page', sql.Int, page)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        DECLARE @total INT;

        SELECT @total = COUNT(*) FROM Usuario;

        SELECT
          u.ID_usuario,
          u.email_usuario,
          u.activo_usuario,
          u.email_confirmado_usuario,
          p.nombres_persona,
          p.apellido_paterno_persona,
          STRING_AGG(r.nombre_rol, ', ') AS roles
        FROM Usuario u
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        LEFT JOIN UsuarioRol ur ON ur.ID_usuario_usuario_rol = u.ID_usuario
        LEFT JOIN Rol r ON r.ID_rol = ur.ID_rol_usuario_rol
        GROUP BY u.ID_usuario, u.email_usuario, u.activo_usuario,
          u.email_confirmado_usuario, p.nombres_persona, p.apellido_paterno_persona
        ORDER BY u.ID_usuario DESC
        OFFSET (@page - 1) * @pageSize ROWS
        FETCH NEXT @pageSize ROWS ONLY;

        SELECT @total AS total;
      `);

    const recordsets = Array.isArray(result.recordsets) ? result.recordsets : Object.values(result.recordsets);
    const items = recordsets[0];
    const total = recordsets[1]?.[0]?.total ?? 0;

    response.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/usuarios/:id/estado', async (request, response, next) => {
  const userId = parseId(request.params.id);
  const active = request.body?.activo;
  if (!userId || typeof active !== 'boolean') {
    response.status(400).json({ message: 'Usuario o estado invalido.' });
    return;
  }
  if (userId === request.user!.id && !active) {
    response.status(400).json({ message: 'No puedes desactivar tu propia cuenta.' });
    return;
  }
  try {
    const pool = await getDatabasePool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('active', sql.Bit, active)
      .query(`UPDATE Usuario SET activo_usuario = @active WHERE ID_usuario = @userId; SELECT @@ROWCOUNT AS affected;`);
    if (result.recordset[0].affected !== 1) {
      response.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }
    response.json({ message: 'Estado del usuario actualizado.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/usuarios/:id/roles', async (request, response, next) => {
  const userId = parseId(request.params.id);
  const roles = Array.isArray(request.body?.roles) ? request.body.roles.filter((role: unknown): role is string => typeof role === 'string') : [];
  const allowedRoles = ['CLIENTE', 'PROVEEDOR', 'ADMIN'];
  if (!userId || roles.length === 0 || roles.some((role: string) => !allowedRoles.includes(role))) {
    response.status(400).json({ message: 'Roles invalidos.' });
    return;
  }
  try {
    const pool = await getDatabasePool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const roleResult = await transaction.request().query(`SELECT ID_rol, nombre_rol FROM Rol WHERE nombre_rol IN ('CLIENTE','PROVEEDOR','ADMIN');`);
      const roleIds = new Map(roleResult.recordset.map((role: { nombre_rol: string; ID_rol: number }) => [role.nombre_rol, role.ID_rol]));
      await transaction.request().input('userId', sql.Int, userId).query('DELETE FROM UsuarioRol WHERE ID_usuario_usuario_rol = @userId;');
      for (const role of roles) {
        await transaction.request().input('userId', sql.Int, userId).input('roleId', sql.Int, roleIds.get(role)).query('INSERT INTO UsuarioRol (ID_usuario_usuario_rol, ID_rol_usuario_rol) VALUES (@userId, @roleId);');
      }
      await transaction.commit();
      response.json({ message: 'Roles actualizados.' });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.patch('/proveedores/:id/estado', async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const state = typeof request.body?.estado === 'string'
    ? request.body.estado.trim().toUpperCase()
    : '';

  const allowed = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'SUSPENDIDO', 'INACTIVO'];

  if (!providerId || !allowed.includes(state)) {
    response.status(400).json({ message: 'Proveedor o estado invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const contact = await pool.request()
      .input('providerId', sql.Int, providerId)
      .query(`
        SELECT TOP 1
          COALESCE(p.email_proveedor, u.email_usuario) AS email,
          COALESCE(pe.nombres_persona, p.nombre_comercial_proveedor) AS nombre
        FROM Proveedor p
        LEFT JOIN ProveedorUsuario pu ON pu.ID_proveedor_proveedor_usuario = p.ID_proveedor AND pu.es_administrador_proveedor_usuario = 1
        LEFT JOIN Usuario u ON u.ID_usuario = pu.ID_usuario_proveedor_usuario
        LEFT JOIN Persona pe ON pe.ID_persona = u.ID_persona_usuario
        WHERE p.ID_proveedor = @providerId;
      `);

    if (state === 'APROBADO') {
      const result = await pool
        .request()
        .input('ID_proveedor', sql.Int, providerId)
        .execute('sp_AprobarProveedor');
      const recipient = contact.recordset[0];
      if (recipient?.email) sendProviderStatusEmail(recipient.email, recipient.nombre, state).catch((error: unknown) => console.error('No fue posible enviar correo de proveedor.', error));
      response.json({ message: 'Proveedor aprobado.', proveedor: providerId });
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('state', sql.VarChar(50), state)
      .query(`
        UPDATE p
        SET ID_estado_proveedor_proveedor = ep.ID_estado_proveedor
        FROM Proveedor p
        INNER JOIN EstadoProveedor ep
          ON ep.nombre_estado_proveedor = @state
        WHERE p.ID_proveedor = @providerId;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      response.status(404).json({ message: 'Proveedor no encontrado.' });
      return;
    }

    const recipient = contact.recordset[0];
    if (recipient?.email) sendProviderStatusEmail(recipient.email, recipient.nombre, state).catch((error: unknown) => console.error('No fue posible enviar correo de proveedor.', error));

    response.json({ message: 'Estado del proveedor actualizado.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/vehiculos/:id/publicacion', async (request, response, next) => {
  const vehicleId = parseId(request.params.id);
  const state = typeof request.body?.estado === 'string'
    ? request.body.estado.trim().toUpperCase()
    : '';

  const allowed = ['PENDIENTE', 'PUBLICADO', 'RECHAZADO', 'SUSPENDIDO'];

  if (!vehicleId || !allowed.includes(state)) {
    response.status(400).json({ message: 'Vehiculo o estado invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();

    if (state === 'PUBLICADO') {
      const result = await pool
        .request()
        .input('ID_vehiculo', sql.Int, vehicleId)
        .execute('sp_PublicarVehiculo');
      response.json({ message: 'Vehiculo publicado.', vehiculo: vehicleId });
      return;
    }

    const result = await pool
      .request()
      .input('vehicleId', sql.Int, vehicleId)
      .input('state', sql.VarChar(50), state)
      .query(`
        UPDATE v
        SET ID_estado_publicacion_vehiculo_vehiculo = epv.ID_estado_publicacion_vehiculo
        FROM Vehiculo v
        INNER JOIN EstadoPublicacionVehiculo epv
          ON epv.nombre_estado_publicacion_vehiculo = @state
        WHERE v.ID_vehiculo = @vehicleId;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      response.status(404).json({ message: 'Vehiculo no encontrado.' });
      return;
    }

    response.json({ message: 'Estado de publicacion actualizado.' });
  } catch (error) {
    next(error);
  }
});

export default router;
