import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

interface VehicleFilters {
  search?: string;
  priceMax?: string;
}

router.get('/', async (request, response, next) => {
  const filters = request.query as VehicleFilters;
  const search = filters.search?.trim() || null;
  const parsedPrice = filters.priceMax ? Number(filters.priceMax) : null;
  const priceMax = parsedPrice && parsedPrice > 0 ? parsedPrice : null;

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('search', sql.NVarChar(150), search)
      .input('priceMax', sql.Decimal(12, 2), priceMax)
      .query(`
        SELECT
          ID_vehiculo,
          patente_vehiculo,
          anio_vehiculo,
          kilometraje_vehiculo,
          precio_diario_base_vehiculo,
          ID_proveedor,
          nombre_comercial_proveedor,
          nombre_tipo_proveedor,
          nombre_marca,
          nombre_modelo,
          nombre_tipo_vehiculo,
          nombre_estado_vehiculo,
          nombre_estado_publicacion_vehiculo,
          ID_sede_proveedor,
          nombre_sede_proveedor,
          nombre_comuna,
          nombre_region
        FROM vw_VehiculosPublicados
        WHERE (
          @search IS NULL
          OR nombre_comercial_proveedor LIKE '%' + @search + '%'
          OR nombre_marca LIKE '%' + @search + '%'
          OR nombre_modelo LIKE '%' + @search + '%'
          OR nombre_tipo_vehiculo LIKE '%' + @search + '%'
          OR nombre_comuna LIKE '%' + @search + '%'
        )
        AND (@priceMax IS NULL OR precio_diario_base_vehiculo <= @priceMax)
        ORDER BY nombre_marca, nombre_modelo, precio_diario_base_vehiculo;
      `);

    response.json({ items: result.recordset, total: result.recordset.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Identificador de vehiculo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('idVehiculo', sql.Int, id)
      .query(`
        SELECT *
        FROM vw_VehiculosPublicados
        WHERE ID_vehiculo = @idVehiculo;
      `);

    const vehicle = result.recordset[0];

    if (!vehicle) {
      response.status(404).json({ message: 'Vehiculo no encontrado.' });
      return;
    }

    const branches = await pool
      .request()
      .input('vehicleId', sql.Int, id)
      .query(`
        SELECT
          s.ID_sede_proveedor,
          s.nombre_sede_proveedor,
          s.direccion_sede_proveedor
        FROM VehiculoSede vs
        INNER JOIN SedeProveedor s
          ON s.ID_sede_proveedor = vs.ID_sede_proveedor_vehiculo_sede
        WHERE vs.ID_vehiculo_vehiculo_sede = @vehicleId
          AND s.activo_sede_proveedor = 1;
      `);

    response.json({ vehicle, branches: branches.recordset });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/publicacion', authenticateToken, async (request, response, next) => {
  const id = Number(request.params.id);
  const state = typeof request.body?.estado === 'string'
    ? request.body.estado.toUpperCase()
    : '';

  if (!Number.isInteger(id) || id <= 0 || !state) {
    response.status(400).json({ message: 'Vehiculo y estado son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('vehicleId', sql.Int, id)
      .input('userId', sql.Int, request.user!.id)
      .input('state', sql.VarChar(50), state)
      .query(`
        UPDATE v
        SET ID_estado_publicacion_vehiculo_vehiculo = ep.ID_estado_publicacion_vehiculo
        FROM Vehiculo v
        INNER JOIN EstadoPublicacionVehiculo ep
          ON ep.nombre_estado_publicacion_vehiculo = @state
        LEFT JOIN ProveedorUsuario pu
          ON pu.ID_proveedor_proveedor_usuario = v.ID_proveedor_vehiculo
         AND pu.ID_usuario_proveedor_usuario = @userId
        LEFT JOIN UsuarioRol ur
          ON ur.ID_usuario_usuario_rol = @userId
        LEFT JOIN Rol r
          ON r.ID_rol = ur.ID_rol_usuario_rol
        WHERE v.ID_vehiculo = @vehicleId
          AND (pu.ID_usuario_proveedor_usuario IS NOT NULL OR r.nombre_rol = 'ADMIN');

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      response.status(404).json({ message: 'Vehiculo, estado o permiso no valido.' });
      return;
    }

    response.json({ message: 'Estado de publicacion actualizado.' });
  } catch (error) {
    next(error);
  }
});

export default router;
