import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, async (request, response, next) => {
  const roles = request.user!.roles;
  const isAdmin = roles.includes('ADMIN');
  const isProvider = roles.includes('PROVEEDOR');

  let itemsWhere: string;
  if (isAdmin) {
    itemsWhere = '1 = 1';
  } else if (isProvider) {
    itemsWhere = `EXISTS (
      SELECT 1
      FROM ProveedorUsuario pu
      WHERE pu.ID_proveedor_proveedor_usuario = v.ID_proveedor_vehiculo
        AND pu.ID_usuario_proveedor_usuario = @userId
    )`;
  } else {
    itemsWhere = 'cl.ID_usuario_cliente = @userId';
  }

  try {
    const pool = await getDatabasePool();

    const itemsResult = await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT
          a.ID_arriendo,
          a.ID_reserva_arriendo,
          a.ID_sede_retiro_real_arriendo,
          sr.nombre_sede_proveedor AS sede_retiro_real,
          a.ID_sede_devolucion_real_arriendo,
          sd.nombre_sede_proveedor AS sede_devolucion_real,
          a.fecha_hora_retiro_real_arriendo,
          a.fecha_hora_devolucion_real_arriendo,
          a.kilometraje_inicial_arriendo,
          a.kilometraje_final_arriendo,
          a.combustible_inicial_arriendo,
          a.combustible_final_arriendo,
          ea.nombre_estado_arriendo,
          er.nombre_estado_reserva,
          CONCAT(pe.nombres_persona, ' ', pe.apellido_paterno_persona)
            AS nombre_cliente,
          u.email_usuario,
          ep.nombre_estado_pago,
          pg.monto_pago,
          v.ID_vehiculo,
          v.patente_vehiculo,
          ma.nombre_marca,
          mo.nombre_modelo,
          pr.ID_proveedor,
          pr.nombre_comercial_proveedor,
          CASE WHEN res.ID_resena IS NULL THEN 0 ELSE 1 END AS resenado
        FROM Arriendo a
        INNER JOIN Reserva re
          ON re.ID_reserva = a.ID_reserva_arriendo
        INNER JOIN Vehiculo v
          ON v.ID_vehiculo = re.ID_vehiculo_reserva
        INNER JOIN Modelo mo
          ON mo.ID_modelo = v.ID_modelo_vehiculo
        INNER JOIN Marca ma
          ON ma.ID_marca = mo.ID_marca_modelo
        INNER JOIN Proveedor pr
          ON pr.ID_proveedor = v.ID_proveedor_vehiculo
        INNER JOIN SedeProveedor sr
          ON sr.ID_sede_proveedor = a.ID_sede_retiro_real_arriendo
        LEFT JOIN SedeProveedor sd
          ON sd.ID_sede_proveedor = a.ID_sede_devolucion_real_arriendo
        INNER JOIN EstadoArriendo ea
          ON ea.ID_estado_arriendo = a.ID_estado_arriendo_arriendo
        INNER JOIN EstadoReserva er
          ON er.ID_estado_reserva = re.ID_estado_reserva_reserva
        INNER JOIN Cliente cl
          ON cl.ID_usuario_cliente = re.ID_usuario_cliente_reserva
        INNER JOIN Usuario u
          ON u.ID_usuario = cl.ID_usuario_cliente
        INNER JOIN Persona pe
          ON pe.ID_persona = u.ID_persona_usuario
        LEFT JOIN Resena res
          ON res.ID_arriendo_resena = a.ID_arriendo
        LEFT JOIN Pago pg
          ON pg.ID_reserva_pago = re.ID_reserva
        LEFT JOIN EstadoPago ep
          ON ep.ID_estado_pago = pg.ID_estado_pago_pago
        WHERE ${itemsWhere}
        ORDER BY a.fecha_hora_retiro_real_arriendo DESC;
      `);

    if (isAdmin || isProvider) {
      const pendingWhere = isAdmin
        ? '1 = 1'
        : `EXISTS (
            SELECT 1
            FROM ProveedorUsuario pu2
            WHERE pu2.ID_proveedor_proveedor_usuario = v.ID_proveedor_vehiculo
              AND pu2.ID_usuario_proveedor_usuario = @userId
          )`;

      const pendingResult = await pool
        .request()
        .input('userId', sql.Int, request.user!.id)
        .query(`
          SELECT
            d.ID_reserva,
            d.fecha_inicio_reserva,
            d.fecha_fin_reserva,
            d.precio_diario_aplicado_reserva,
            d.nombre_cliente,
            d.email_usuario,
            d.ID_vehiculo,
            d.patente_vehiculo,
            d.nombre_modelo,
            d.nombre_marca,
            d.ID_proveedor,
            d.nombre_comercial_proveedor,
            d.sede_retiro,
            d.sede_devolucion,
            d.monto_pago
          FROM vw_ReservasDetalle d
          INNER JOIN Reserva re ON re.ID_reserva = d.ID_reserva
          INNER JOIN Vehiculo v ON v.ID_vehiculo = re.ID_vehiculo_reserva
          WHERE d.nombre_estado_reserva = 'CONFIRMADA'
            AND d.ID_arriendo IS NULL
            AND (${pendingWhere})
          ORDER BY d.fecha_inicio_reserva;
        `);

      return response.json({ items: itemsResult.recordset, pendientes: pendingResult.recordset });
    }

    response.json({ items: itemsResult.recordset, pendientes: [] });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (request, response, next) => {
  const body = request.body as {
    ID_reserva?: number;
    ID_sede_retiro_real?: number;
    kilometraje_inicial?: number;
    combustible_inicial?: number;
  };

  if (!body.ID_reserva || !body.ID_sede_retiro_real) {
    response.status(400).json({ message: 'Reserva y sede de retiro son obligatorias.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const ownership = await pool
      .request()
      .input('reservationId', sql.Int, body.ID_reserva)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM UsuarioRol ur
              INNER JOIN Rol ro ON ro.ID_rol = ur.ID_rol_usuario_rol
              WHERE ur.ID_usuario_usuario_rol = @userId
                AND ro.nombre_rol = 'ADMIN'
            ) THEN 1
            WHEN EXISTS (
              SELECT 1
              FROM Reserva re
              INNER JOIN Vehiculo v
                ON v.ID_vehiculo = re.ID_vehiculo_reserva
              INNER JOIN ProveedorUsuario pu
                ON pu.ID_proveedor_proveedor_usuario = v.ID_proveedor_vehiculo
              WHERE re.ID_reserva = @reservationId
                AND pu.ID_usuario_proveedor_usuario = @userId
            ) THEN 1
            ELSE 0
          END AS allowed;
      `);

    if (ownership.recordset[0].allowed !== 1) {
      response.status(403).json({ message: 'No tienes permisos para iniciar este arriendo.' });
      return;
    }

    await pool
      .request()
      .input('ID_reserva', sql.Int, body.ID_reserva)
      .input('ID_sede_retiro_real', sql.Int, body.ID_sede_retiro_real)
      .input('kilometraje_inicial', sql.Int, body.kilometraje_inicial)
      .input('combustible_inicial', sql.Decimal(5, 2), body.combustible_inicial)
      .execute('sp_IniciarArriendo');

    const arriendo = await pool
      .request()
      .input('reservationId', sql.Int, body.ID_reserva)
      .query(`
        SELECT ID_arriendo
        FROM Arriendo
        WHERE ID_reserva_arriendo = @reservationId;
      `);

    response.status(201).json({
      message: 'Arriendo iniciado.',
      ID_arriendo: arriendo.recordset[0].ID_arriendo,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/devolucion', authenticateToken, async (request, response, next) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Arriendo invalido.' });
    return;
  }

  const body = request.body as {
    ID_sede_devolucion_real?: number;
    kilometraje_final?: number;
    combustible_final?: number;
  };

  if (!body.ID_sede_devolucion_real) {
    response.status(400).json({ message: 'Sede de devolucion es obligatoria.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const ownership = await pool
      .request()
      .input('arriendoId', sql.Int, id)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM UsuarioRol ur
              INNER JOIN Rol ro ON ro.ID_rol = ur.ID_rol_usuario_rol
              WHERE ur.ID_usuario_usuario_rol = @userId
                AND ro.nombre_rol = 'ADMIN'
            ) THEN 1
            WHEN EXISTS (
              SELECT 1
              FROM Arriendo a
              INNER JOIN Reserva re
                ON re.ID_reserva = a.ID_reserva_arriendo
              INNER JOIN Vehiculo v
                ON v.ID_vehiculo = re.ID_vehiculo_reserva
              INNER JOIN ProveedorUsuario pu
                ON pu.ID_proveedor_proveedor_usuario = v.ID_proveedor_vehiculo
              WHERE a.ID_arriendo = @arriendoId
                AND pu.ID_usuario_proveedor_usuario = @userId
            ) THEN 1
            ELSE 0
          END AS allowed;
      `);

    if (ownership.recordset[0].allowed !== 1) {
      response.status(403).json({ message: 'No tienes permisos para cerrar este arriendo.' });
      return;
    }

    await pool
      .request()
      .input('ID_arriendo', sql.Int, id)
      .input('ID_sede_devolucion_real', sql.Int, body.ID_sede_devolucion_real)
      .input('kilometraje_final', sql.Int, body.kilometraje_final)
      .input('combustible_final', sql.Decimal(5, 2), body.combustible_final)
      .execute('sp_RegistrarDevolucion');

    response.json({ message: 'Devolucion registrada.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resenas', authenticateToken, async (request, response, next) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Arriendo invalido.' });
    return;
  }

  const body = request.body as {
    calificacion?: number;
    comentario?: string;
  };

  const calificacion = Number(body.calificacion);
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    response.status(400).json({ message: 'Calificacion debe ser un entero entre 1 y 5.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    await pool
      .request()
      .input('ID_usuario_cliente', sql.Int, request.user!.id)
      .input('ID_arriendo', sql.Int, id)
      .input('calificacion', sql.TinyInt, calificacion)
      .input('comentario', sql.NVarChar(1000), body.comentario?.trim() || null)
      .execute('sp_CrearResena');

    response.status(201).json({ message: 'Resena creada.' });
  } catch (error) {
    next(error);
  }
});

export default router;