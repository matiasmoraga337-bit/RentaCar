import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';

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

    if (state === 'APROBADO') {
      const result = await pool
        .request()
        .input('ID_proveedor', sql.Int, providerId)
        .execute('sp_AprobarProveedor');
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