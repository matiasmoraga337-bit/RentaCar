import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';

const router = Router();

interface ProviderBody {
  tipo?: 'PERSONA' | 'EMPRESA';
  idPersona?: number;
  nombreComercial?: string;
  razonSocial?: string;
  rutProveedor?: string;
  telefono?: string;
  email?: string;
}

function parseId(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function hasProviderAccess(
  pool: sql.ConnectionPool,
  providerId: number,
  userId: number,
  isAdmin: boolean,
) {
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

router.post('/', authenticateToken, async (request, response, next) => {
  const body = request.body as ProviderBody;
  const type = body.tipo;
  const name = body.nombreComercial?.trim();

  if (!type || !name) {
    response.status(400).json({ message: 'Tipo y nombre comercial son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const typeResult = await transaction
        .request()
        .input('type', sql.VarChar(50), type)
        .query(`
          SELECT ID_tipo_proveedor
          FROM TipoProveedor
          WHERE nombre_tipo_proveedor = @type;
        `);

      const typeId = typeResult.recordset[0]?.ID_tipo_proveedor as number | undefined;

      if (!typeId) {
        await transaction.rollback();
        response.status(400).json({ message: 'Tipo de proveedor invalido.' });
        return;
      }

      let personId = body.idPersona ?? null;

      if (type === 'PERSONA' && !personId) {
        const personResult = await transaction
          .request()
          .input('userId', sql.Int, request.user!.id)
          .query(`
            SELECT ID_persona_usuario
            FROM Usuario
            WHERE ID_usuario = @userId;
          `);
        personId = personResult.recordset[0]?.ID_persona_usuario ?? null;
      }

      const providerResult = await transaction
        .request()
        .input('ID_tipo_proveedor', sql.Int, typeId)
        .input('ID_persona_proveedor', sql.Int, personId)
        .input('nombre_comercial', sql.NVarChar(150), name)
        .input('razon_social', sql.NVarChar(150), body.razonSocial?.trim() || null)
        .input('rut_proveedor', sql.VarChar(12), body.rutProveedor?.trim() || null)
        .input('telefono', sql.VarChar(20), body.telefono?.trim() || null)
        .input('email', sql.VarChar(150), body.email?.trim().toLowerCase() || null)
        .execute('sp_RegistrarProveedor');

      const providerId = providerResult.recordset[0]?.ID_proveedor as number | undefined;

      if (!providerId) {
        throw new Error('No fue posible obtener el proveedor creado.');
      }

      await transaction
        .request()
        .input('providerId', sql.Int, providerId)
        .input('userId', sql.Int, request.user!.id)
        .query(`
          INSERT INTO ProveedorUsuario
          (
            ID_proveedor_proveedor_usuario,
            ID_usuario_proveedor_usuario,
            es_administrador_proveedor_usuario
          )
          VALUES (@providerId, @userId, 1);

          INSERT INTO ConfiguracionProveedor
          (
            ID_proveedor_configuracion_proveedor
          )
          VALUES (@providerId);
        `);

      await transaction.commit();
      response.status(201).json({ providerId });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, async (request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT
          p.ID_proveedor,
          p.nombre_comercial_proveedor,
          p.razon_social_proveedor,
          p.rut_proveedor,
          ep.nombre_estado_proveedor,
          pu.es_administrador_proveedor_usuario
        FROM Proveedor p
        INNER JOIN ProveedorUsuario pu
          ON pu.ID_proveedor_proveedor_usuario = p.ID_proveedor
        INNER JOIN EstadoProveedor ep
          ON ep.ID_estado_proveedor = p.ID_estado_proveedor_proveedor
        WHERE pu.ID_usuario_proveedor_usuario = @userId;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/sedes', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const { idComuna, nombre, direccion, telefono, email } = request.body as {
    idComuna?: number;
    nombre?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };

  if (!providerId || !idComuna || !nombre?.trim() || !direccion?.trim()) {
    response.status(400).json({ message: 'Proveedor, comuna, nombre y direccion son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const isAdmin = request.user!.roles.includes('ADMIN');

    if (!(await hasProviderAccess(pool, providerId, request.user!.id, isAdmin))) {
      response.status(403).json({ message: 'No puedes modificar este proveedor.' });
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('communeId', sql.Int, idComuna)
      .input('name', sql.NVarChar(100), nombre.trim())
      .input('address', sql.NVarChar(200), direccion.trim())
      .input('phone', sql.VarChar(20), telefono?.trim() || null)
      .input('email', sql.VarChar(150), email?.trim().toLowerCase() || null)
      .query(`
        INSERT INTO SedeProveedor
        (
          ID_proveedor_sede_proveedor,
          ID_comuna_sede_proveedor,
          nombre_sede_proveedor,
          direccion_sede_proveedor,
          telefono_sede_proveedor,
          email_sede_proveedor
        )
        OUTPUT INSERTED.ID_sede_proveedor
        VALUES (@providerId, @communeId, @name, @address, @phone, @email);
      `);

    response.status(201).json({ id: result.recordset[0].ID_sede_proveedor });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/vehiculos', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);

  if (!providerId) {
    response.status(400).json({ message: 'Proveedor invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const isAdmin = request.user!.roles.includes('ADMIN');

    if (!(await hasProviderAccess(pool, providerId, request.user!.id, isAdmin))) {
      response.status(403).json({ message: 'No puedes consultar este proveedor.' });
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .query(`
        SELECT
          v.ID_vehiculo,
          v.patente_vehiculo,
          v.vin_vehiculo,
          v.anio_vehiculo,
          v.kilometraje_vehiculo,
          v.precio_diario_base_vehiculo,
          m.nombre_marca,
          mo.nombre_modelo,
          ev.nombre_estado_vehiculo,
          ep.nombre_estado_publicacion_vehiculo
        FROM Vehiculo v
        INNER JOIN Modelo mo ON mo.ID_modelo = v.ID_modelo_vehiculo
        INNER JOIN Marca m ON m.ID_marca = mo.ID_marca_modelo
        INNER JOIN EstadoVehiculo ev
          ON ev.ID_estado_vehiculo = v.ID_estado_vehiculo_vehiculo
        INNER JOIN EstadoPublicacionVehiculo ep
          ON ep.ID_estado_publicacion_vehiculo =
             v.ID_estado_publicacion_vehiculo_vehiculo
        WHERE v.ID_proveedor_vehiculo = @providerId
        ORDER BY v.fecha_registro_vehiculo DESC;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vehiculos', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const body = request.body as {
    idSedeActual?: number;
    idModelo?: number;
    idTipoVehiculo?: number;
    idTipoCombustible?: number;
    idTipoTransmision?: number;
    patente?: string;
    vin?: string;
    anio?: number;
    kilometraje?: number;
    precioDiario?: number;
  };

  if (
    !providerId ||
    !body.idModelo ||
    !body.idTipoVehiculo ||
    !body.idTipoCombustible ||
    !body.idTipoTransmision ||
    !body.idSedeActual ||
    !body.patente?.trim() ||
    !body.vin?.trim() ||
    !body.anio ||
    body.kilometraje === undefined ||
    !body.precioDiario
  ) {
    response.status(400).json({ message: 'Faltan datos obligatorios del vehiculo.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const isAdmin = request.user!.roles.includes('ADMIN');

    if (!(await hasProviderAccess(pool, providerId, request.user!.id, isAdmin))) {
      response.status(403).json({ message: 'No puedes modificar este proveedor.' });
      return;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const stateResult = await transaction.request().query(`
        SELECT
          (SELECT ID_estado_vehiculo FROM EstadoVehiculo WHERE nombre_estado_vehiculo = 'DISPONIBLE') AS availableState,
          (SELECT ID_estado_publicacion_vehiculo FROM EstadoPublicacionVehiculo WHERE nombre_estado_publicacion_vehiculo = 'PENDIENTE') AS pendingPublication;
      `);
      const states = stateResult.recordset[0];

      const vehicleResult = await transaction
        .request()
        .input('providerId', sql.Int, providerId)
        .input('currentBranch', sql.Int, body.idSedeActual)
        .input('modelId', sql.Int, body.idModelo)
        .input('typeId', sql.Int, body.idTipoVehiculo)
        .input('fuelId', sql.Int, body.idTipoCombustible)
        .input('transmissionId', sql.Int, body.idTipoTransmision)
        .input('operationalState', sql.Int, states.availableState)
        .input('publicationState', sql.Int, states.pendingPublication)
        .input('plate', sql.VarChar(10), body.patente.trim().toUpperCase())
        .input('vin', sql.VarChar(17), body.vin.trim().toUpperCase())
        .input('year', sql.SmallInt, body.anio)
        .input('mileage', sql.Int, body.kilometraje)
        .input('dailyPrice', sql.Decimal(12, 2), body.precioDiario)
        .query(`
          DECLARE @insertedVehiculo TABLE (ID_vehiculo INT);

          INSERT INTO Vehiculo
          (
            ID_proveedor_vehiculo,
            ID_sede_actual_vehiculo,
            ID_modelo_vehiculo,
            ID_tipo_vehiculo_vehiculo,
            ID_tipo_combustible_vehiculo,
            ID_tipo_transmision_vehiculo,
            ID_estado_vehiculo_vehiculo,
            ID_estado_publicacion_vehiculo_vehiculo,
            patente_vehiculo,
            vin_vehiculo,
            anio_vehiculo,
            kilometraje_vehiculo,
            precio_diario_base_vehiculo
          )
          OUTPUT INSERTED.ID_vehiculo INTO @insertedVehiculo
          VALUES
          (
            @providerId,
            @currentBranch,
            @modelId,
            @typeId,
            @fuelId,
            @transmissionId,
            @operationalState,
            @publicationState,
            @plate,
            @vin,
            @year,
            @mileage,
            @dailyPrice
          );

          SELECT ID_vehiculo FROM @insertedVehiculo;
        `);

      const vehicleId = vehicleResult.recordset[0].ID_vehiculo as number;

      await transaction
        .request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('branchId', sql.Int, body.idSedeActual)
        .query(`
          INSERT INTO VehiculoSede
          (
            ID_vehiculo_vehiculo_sede,
            ID_sede_proveedor_vehiculo_sede
          )
          VALUES (@vehicleId, @branchId);
        `);

      await transaction.commit();
      response.status(201).json({ ID_vehiculo: vehicleId });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/estado', authenticateToken, requireRoles('ADMIN'), async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const state = typeof request.body?.estado === 'string'
    ? request.body.estado.toUpperCase()
    : '';

  if (!providerId || !state) {
    response.status(400).json({ message: 'Proveedor y estado son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
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
      response.status(404).json({ message: 'Proveedor o estado no encontrado.' });
      return;
    }

    response.json({ message: 'Estado del proveedor actualizado.' });
  } catch (error) {
    next(error);
  }
});

export default router;
