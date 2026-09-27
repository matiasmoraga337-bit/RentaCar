import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { assertProviderAccess } from '../middlewares/provider-access.js';
import { parseId } from '../utils/id.js';
import {
  assetHttpPath,
  discardInvalidPngFiles,
  MAX_PHOTO_COUNT,
  removeFileByUrl,
  removeUploadedFiles,
  uploadVehiclePhotos,
} from '../config/uploads.js';

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
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
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

router.get('/:id/sedes', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);

  if (!providerId) {
    response.status(400).json({ message: 'Proveedor invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .query(`
        SELECT
          s.ID_sede_proveedor,
          s.nombre_sede_proveedor,
          s.direccion_sede_proveedor,
          c.nombre_comuna,
          r.nombre_region
        FROM SedeProveedor s
        INNER JOIN Comuna c ON c.ID_comuna = s.ID_comuna_sede_proveedor
        INNER JOIN Region r ON r.ID_region = c.ID_region_comuna
        WHERE s.ID_proveedor_sede_proveedor = @providerId
          AND s.activo_sede_proveedor = 1
        ORDER BY s.nombre_sede_proveedor;
      `);

    response.json(result.recordset);
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
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
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
          ep.nombre_estado_publicacion_vehiculo,
          (
            SELECT TOP 1 f.url_foto_vehiculo
            FROM VehiculoFoto f
            WHERE f.ID_vehiculo_vehiculo_foto = v.ID_vehiculo
              AND f.es_principal_foto = 1
              AND f.activo_foto_vehiculo = 1
          ) AS url_foto_principal
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
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
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

router.post('/:id/vehiculos/:vehicleId/fotos', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);

  if (!providerId || !vehicleId) {
    response.status(400).json({ message: 'Proveedor o vehiculo invalido.' });
    return;
  }

  let files: Express.Multer.File[];
  try {
    files = await uploadVehiclePhotos(request, response);
  } catch (error) {
    next(error);
    return;
  }

  try {
    const pool = await getDatabasePool();

    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      removeUploadedFiles(files);
      return;
    }

    const vehicleResult = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT ID_vehiculo
        FROM Vehiculo
        WHERE ID_vehiculo = @vehicleId
          AND ID_proveedor_vehiculo = @providerId;
      `);

    if (vehicleResult.recordset.length === 0) {
      removeUploadedFiles(files);
      response.status(404).json({ message: 'Vehiculo no encontrado.' });
      return;
    }

    const validFiles = discardInvalidPngFiles(files);

    if (validFiles.length !== files.length) {
      removeUploadedFiles(validFiles);
      response.status(400).json({ message: 'Solo se permiten imagenes PNG validas.' });
      return;
    }

    const countResult = await pool
      .request()
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT COUNT(*) AS total
        FROM VehiculoFoto
        WHERE ID_vehiculo_vehiculo_foto = @vehicleId
          AND activo_foto_vehiculo = 1;
      `);

    if (countResult.recordset[0].total + validFiles.length > MAX_PHOTO_COUNT) {
      removeUploadedFiles(validFiles);
      response.status(400).json({ message: `Maximo ${MAX_PHOTO_COUNT} fotos por vehiculo.` });
      return;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const hasNoPhotoYet = countResult.recordset[0].total === 0;
      const inserted: Array<{ ID_foto_vehiculo: number; url_foto_vehiculo: string; es_principal_foto: boolean }> = [];

      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];

        const insertResult = await transaction
          .request()
          .input('vehicleId', sql.Int, vehicleId)
          .input('url', sql.VarChar(500), assetHttpPath(file.filename))
          .input('principal', sql.Bit, hasNoPhotoYet && index === 0)
          .query(`
            INSERT INTO VehiculoFoto
            (
              ID_vehiculo_vehiculo_foto,
              url_foto_vehiculo,
              es_principal_foto
            )
            OUTPUT INSERTED.ID_foto_vehiculo, INSERTED.url_foto_vehiculo, INSERTED.es_principal_foto
            VALUES (@vehicleId, @url, @principal);
          `);

        inserted.push(insertResult.recordset[0]);
      }

      await transaction.commit();
      response.status(201).json({ fotos: inserted });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      removeUploadedFiles(validFiles);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:id/vehiculos/:vehicleId/fotos', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);

  if (!providerId || !vehicleId) {
    response.status(400).json({ message: 'Proveedor o vehiculo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT
          f.ID_foto_vehiculo,
          f.url_foto_vehiculo,
          f.es_principal_foto,
          f.fecha_subida_foto
        FROM VehiculoFoto f
        INNER JOIN Vehiculo v
          ON v.ID_vehiculo = f.ID_vehiculo_vehiculo_foto
        WHERE f.ID_vehiculo_vehiculo_foto = @vehicleId
          AND v.ID_proveedor_vehiculo = @providerId
          AND f.activo_foto_vehiculo = 1
        ORDER BY f.es_principal_foto DESC, f.fecha_subida_foto, f.ID_foto_vehiculo;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/vehiculos/:vehicleId/fotos/:photoId/principal', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);
  const photoId = parseId(request.params.photoId);

  if (!providerId || !vehicleId || !photoId) {
    response.status(400).json({ message: 'Proveedor, vehiculo o foto invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('photoId', sql.Int, photoId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM Vehiculo
          WHERE ID_vehiculo = @vehicleId
            AND ID_proveedor_vehiculo = @providerId
        )
        BEGIN
          SELECT 0 AS ok, 'Vehiculo no encontrado.' AS message;
        END
        ELSE IF NOT EXISTS (
          SELECT 1 FROM VehiculoFoto
          WHERE ID_foto_vehiculo = @photoId
            AND ID_vehiculo_vehiculo_foto = @vehicleId
            AND activo_foto_vehiculo = 1
        )
        BEGIN
          SELECT 0 AS ok, 'Foto no encontrada.' AS message;
        END
        ELSE
        BEGIN
          UPDATE VehiculoFoto
          SET es_principal_foto = 0
          WHERE ID_vehiculo_vehiculo_foto = @vehicleId
            AND activo_foto_vehiculo = 1;

          UPDATE VehiculoFoto
          SET es_principal_foto = 1
          WHERE ID_foto_vehiculo = @photoId
            AND ID_vehiculo_vehiculo_foto = @vehicleId;

          SELECT 1 AS ok, 'Foto principal actualizada.' AS message;
        END
      `);

    const outcome = result.recordset[0];
    if (outcome.ok !== 1) {
      response.status(outcome.message === 'Vehiculo no encontrado.' ? 404 : 400).json({ message: outcome.message });
      return;
    }

    response.json({ message: 'Foto principal actualizada.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/vehiculos/:vehicleId/fotos/:photoId', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);
  const photoId = parseId(request.params.photoId);

  if (!providerId || !vehicleId || !photoId) {
    response.status(400).json({ message: 'Proveedor, vehiculo o foto invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const photoResult = await transaction
        .request()
        .input('providerId', sql.Int, providerId)
        .input('vehicleId', sql.Int, vehicleId)
        .input('photoId', sql.Int, photoId)
        .query(`
          SELECT f.ID_foto_vehiculo, f.url_foto_vehiculo, f.es_principal_foto
          FROM VehiculoFoto f
          INNER JOIN Vehiculo v
            ON v.ID_vehiculo = f.ID_vehiculo_vehiculo_foto
          WHERE f.ID_foto_vehiculo = @photoId
            AND f.ID_vehiculo_vehiculo_foto = @vehicleId
            AND v.ID_proveedor_vehiculo = @providerId
            AND f.activo_foto_vehiculo = 1;
        `);

      const photo = photoResult.recordset[0];

      if (!photo) {
        await transaction.rollback();
        response.status(404).json({ message: 'Foto no encontrada.' });
        return;
      }

      await transaction
        .request()
        .input('photoId', sql.Int, photoId)
        .query(`
          UPDATE VehiculoFoto
          SET activo_foto_vehiculo = 0
          WHERE ID_foto_vehiculo = @photoId;
        `);

      if (photo.es_principal_foto) {
        const remainingResult = await transaction
          .request()
          .input('vehicleId', sql.Int, vehicleId)
          .input('photoId', sql.Int, photoId)
          .query(`
            SELECT TOP 1 ID_foto_vehiculo
            FROM VehiculoFoto
            WHERE ID_vehiculo_vehiculo_foto = @vehicleId
              AND activo_foto_vehiculo = 1
              AND ID_foto_vehiculo <> @photoId
            ORDER BY fecha_subida_foto, ID_foto_vehiculo;
          `);

        if (remainingResult.recordset[0]) {
          await transaction
            .request()
            .input('newPrincipal', sql.Int, remainingResult.recordset[0].ID_foto_vehiculo)
            .query(`
              UPDATE VehiculoFoto
              SET es_principal_foto = 1
              WHERE ID_foto_vehiculo = @newPrincipal;
            `);
        }
      }

      await transaction.commit();
      removeFileByUrl(photo.url_foto_vehiculo);

      response.json({ message: 'Foto eliminada.', id: photo.ID_foto_vehiculo });
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

router.get('/:id/vehiculos/:vehicleId/sedes', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);

  if (!providerId || !vehicleId) {
    response.status(400).json({ message: 'Proveedor o vehiculo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT
          vs.ID_sede_proveedor_vehiculo_sede AS ID_sede_proveedor,
          s.nombre_sede_proveedor,
          s.direccion_sede_proveedor,
          vs.disponible_para_entrega,
          vs.disponible_para_devolucion,
          CASE WHEN v.ID_sede_actual_vehiculo = s.ID_sede_proveedor THEN 1 ELSE 0 END AS es_actual
        FROM VehiculoSede vs
        INNER JOIN SedeProveedor s
          ON s.ID_sede_proveedor = vs.ID_sede_proveedor_vehiculo_sede
        INNER JOIN Vehiculo v
          ON v.ID_vehiculo = vs.ID_vehiculo_vehiculo_sede
        WHERE vs.ID_vehiculo_vehiculo_sede = @vehicleId
          AND v.ID_proveedor_vehiculo = @providerId
        ORDER BY s.nombre_sede_proveedor;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vehiculos/:vehicleId/sedes', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);
  const body = request.body as {
    idSede?: number;
    disponibleParaEntrega?: boolean;
    disponibleParaDevolucion?: boolean;
  };

  if (!providerId || !vehicleId || !body.idSede) {
    response.status(400).json({ message: 'Proveedor, vehiculo y sede son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('sedeId', sql.Int, body.idSede)
      .input('delivery', sql.Bit, body.disponibleParaEntrega ?? true)
      .input('returns', sql.Bit, body.disponibleParaDevolucion ?? true)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM Vehiculo
          WHERE ID_vehiculo = @vehicleId AND ID_proveedor_vehiculo = @providerId
        )
        BEGIN
          SELECT 0 AS ok, 'Vehiculo no encontrado.' AS message;
        END
        ELSE IF NOT EXISTS (
          SELECT 1 FROM SedeProveedor
          WHERE ID_sede_proveedor = @sedeId
            AND ID_proveedor_sede_proveedor = @providerId
            AND activo_sede_proveedor = 1
        )
        BEGIN
          SELECT 0 AS ok, 'Sede no valida para el proveedor.' AS message;
        END
        ELSE
        BEGIN
          IF EXISTS (
            SELECT 1 FROM VehiculoSede
            WHERE ID_vehiculo_vehiculo_sede = @vehicleId
              AND ID_sede_proveedor_vehiculo_sede = @sedeId
          )
          BEGIN
            UPDATE VehiculoSede
            SET disponible_para_entrega = @delivery,
                disponible_para_devolucion = @returns
            WHERE ID_vehiculo_vehiculo_sede = @vehicleId
              AND ID_sede_proveedor_vehiculo_sede = @sedeId;
          END
          ELSE
          BEGIN
            INSERT INTO VehiculoSede
            (
              ID_vehiculo_vehiculo_sede,
              ID_sede_proveedor_vehiculo_sede,
              disponible_para_entrega,
              disponible_para_devolucion
            )
            VALUES (@vehicleId, @sedeId, @delivery, @returns);
          END

          SELECT 1 AS ok, 'Sede habilitada.' AS message;
        END
      `);

    const outcome = result.recordset[0];
    if (outcome.ok !== 1) {
      response.status(400).json({ message: outcome.message });
      return;
    }

    response.status(201).json({ message: 'Sede habilitada para el vehiculo.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/vehiculos/:vehicleId/sedes/:sedeId', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);
  const sedeId = parseId(request.params.sedeId);

  if (!providerId || !vehicleId || !sedeId) {
    response.status(400).json({ message: 'Proveedor, vehiculo o sede invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('sedeId', sql.Int, sedeId)
      .query(`
        IF EXISTS (
          SELECT 1 FROM Vehiculo
          WHERE ID_vehiculo = @vehicleId
            AND ID_proveedor_vehiculo = @providerId
            AND ID_sede_actual_vehiculo = @sedeId
        )
        BEGIN
          SELECT 0 AS ok, 'No puedes quitar la sede actual del vehiculo.' AS message;
        END
        ELSE
        BEGIN
          DELETE FROM VehiculoSede
          WHERE ID_vehiculo_vehiculo_sede = @vehicleId
            AND ID_sede_proveedor_vehiculo_sede = @sedeId;

          SELECT CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END AS ok,
                 CASE WHEN @@ROWCOUNT > 0 THEN 'Sede removida.' ELSE 'La sede no estaba habilitada.' END AS message;
        END
      `);

    const outcome = result.recordset[0];
    if (outcome.ok !== 1) {
      response.status(400).json({ message: outcome.message });
      return;
    }

    response.json({ message: 'Sede removida.' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/vehiculos/:vehicleId/movimientos', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);

  if (!providerId || !vehicleId) {
    response.status(400).json({ message: 'Proveedor o vehiculo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('vehicleId', sql.Int, vehicleId)
      .query(`
        SELECT
          m.ID_movimiento_vehiculo,
          m.fecha_movimiento_vehiculo,
          m.observacion_movimiento_vehiculo,
          so.nombre_sede_proveedor AS sede_origen,
          sd.nombre_sede_proveedor AS sede_destino
        FROM MovimientoVehiculo m
        INNER JOIN Vehiculo v
          ON v.ID_vehiculo = m.ID_vehiculo_movimiento_vehiculo
        LEFT JOIN SedeProveedor so
          ON so.ID_sede_proveedor = m.ID_sede_origen_movimiento_vehiculo
        LEFT JOIN SedeProveedor sd
          ON sd.ID_sede_proveedor = m.ID_sede_destino_movimiento_vehiculo
        WHERE m.ID_vehiculo_movimiento_vehiculo = @vehicleId
          AND v.ID_proveedor_vehiculo = @providerId
        ORDER BY m.fecha_movimiento_vehiculo DESC;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vehiculos/:vehicleId/movimiento', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const vehicleId = parseId(request.params.vehicleId);
  const body = request.body as { idSedeDestino?: number; observacion?: string };

  if (!providerId || !vehicleId || !body.idSedeDestino) {
    response.status(400).json({ message: 'Proveedor, vehiculo y sede destino son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const vehicleResult = await transaction
        .request()
        .input('providerId', sql.Int, providerId)
        .input('vehicleId', sql.Int, vehicleId)
        .query(`
          SELECT
            v.ID_sede_actual_vehiculo,
            ev.nombre_estado_vehiculo,
            CASE WHEN EXISTS (
              SELECT 1
              FROM Arriendo a
              INNER JOIN EstadoArriendo ea
                ON ea.ID_estado_arriendo = a.ID_estado_arriendo_arriendo
              INNER JOIN Reserva r
                ON r.ID_reserva = a.ID_reserva_arriendo
              WHERE r.ID_vehiculo_reserva = v.ID_vehiculo
                AND ea.nombre_estado_arriendo = 'ACTIVO'
            ) THEN 1 ELSE 0 END AS tiene_arriendo_activo
          FROM Vehiculo v
          INNER JOIN EstadoVehiculo ev
            ON ev.ID_estado_vehiculo = v.ID_estado_vehiculo_vehiculo
          WHERE v.ID_vehiculo = @vehicleId
            AND v.ID_proveedor_vehiculo = @providerId;
        `);

      const vehicle = vehicleResult.recordset[0];

      if (!vehicle) {
        await transaction.rollback();
        response.status(404).json({ message: 'Vehiculo no encontrado.' });
        return;
      }

      const origin = vehicle.ID_sede_actual_vehiculo as number | null;

      if (vehicle.nombre_estado_vehiculo === 'ARRENDADO' || vehicle.tiene_arriendo_activo === 1) {
        await transaction.rollback();
        response.status(409).json({ message: 'No puedes trasladar un vehiculo con un arriendo activo.' });
        return;
      }

      if (origin === body.idSedeDestino) {
        await transaction.rollback();
        response.status(400).json({ message: 'El vehiculo ya esta en esa sede.' });
        return;
      }

      const destinationResult = await transaction
        .request()
        .input('providerId', sql.Int, providerId)
        .input('sedeId', sql.Int, body.idSedeDestino)
        .query(`
          SELECT 1
          FROM SedeProveedor
          WHERE ID_sede_proveedor = @sedeId
            AND ID_proveedor_sede_proveedor = @providerId
            AND activo_sede_proveedor = 1;
        `);

      if (destinationResult.recordset.length === 0) {
        await transaction.rollback();
        response.status(400).json({ message: 'Sede destino no valida para el proveedor.' });
        return;
      }

      await transaction
        .request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('origin', sql.Int, origin)
        .input('destination', sql.Int, body.idSedeDestino)
        .input('observation', sql.NVarChar(300), body.observacion?.trim() || null)
        .query(`
          INSERT INTO MovimientoVehiculo
          (
            ID_vehiculo_movimiento_vehiculo,
            ID_sede_origen_movimiento_vehiculo,
            ID_sede_destino_movimiento_vehiculo,
            observacion_movimiento_vehiculo
          )
          VALUES (@vehicleId, @origin, @destination, @observation);

          UPDATE Vehiculo
          SET ID_sede_actual_vehiculo = @destination
          WHERE ID_vehiculo = @vehicleId;

          IF NOT EXISTS (
            SELECT 1 FROM VehiculoSede
            WHERE ID_vehiculo_vehiculo_sede = @vehicleId
              AND ID_sede_proveedor_vehiculo_sede = @destination
          )
            INSERT INTO VehiculoSede
            (
              ID_vehiculo_vehiculo_sede,
              ID_sede_proveedor_vehiculo_sede
            )
            VALUES (@vehicleId, @destination);
        `);

      await transaction.commit();
      response.status(201).json({ message: 'Vehiculo trasladado de sede.' });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:id/configuracion', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);

  if (!providerId) {
    response.status(400).json({ message: 'Proveedor invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .query(`
        SELECT
          ISNULL(permite_devolucion_otra_sede, 0) AS permite_devolucion_otra_sede,
          ISNULL(permite_entrega_domicilio, 0) AS permite_entrega_domicilio,
          ISNULL(permite_retiro_domicilio, 0) AS permite_retiro_domicilio,
          radio_maximo_km
        FROM ConfiguracionProveedor
        WHERE ID_proveedor_configuracion_proveedor = @providerId;
      `);

    response.json(result.recordset[0] ?? {
      permite_devolucion_otra_sede: false,
      permite_entrega_domicilio: false,
      permite_retiro_domicilio: false,
      radio_maximo_km: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/reporte', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  if (!providerId) {
    response.status(400).json({ message: 'Proveedor invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    const result = await pool.request()
      .input('providerId', sql.Int, providerId)
      .query(`
        SELECT
          p.nombre_comercial_proveedor,
          (SELECT COUNT(*) FROM Vehiculo WHERE ID_proveedor_vehiculo = p.ID_proveedor) AS total_vehiculos,
          (SELECT COUNT(*) FROM Vehiculo v INNER JOIN EstadoPublicacionVehiculo ep ON ep.ID_estado_publicacion_vehiculo = v.ID_estado_publicacion_vehiculo_vehiculo WHERE v.ID_proveedor_vehiculo = p.ID_proveedor AND ep.nombre_estado_publicacion_vehiculo = 'PUBLICADO') AS vehiculos_publicados,
          (SELECT COUNT(*) FROM Reserva r INNER JOIN Vehiculo v ON v.ID_vehiculo = r.ID_vehiculo_reserva WHERE v.ID_proveedor_vehiculo = p.ID_proveedor) AS total_reservas,
          (SELECT COUNT(*) FROM Arriendo a INNER JOIN Reserva r ON r.ID_reserva = a.ID_reserva_arriendo INNER JOIN Vehiculo v ON v.ID_vehiculo = r.ID_vehiculo_reserva INNER JOIN EstadoArriendo ea ON ea.ID_estado_arriendo = a.ID_estado_arriendo_arriendo WHERE v.ID_proveedor_vehiculo = p.ID_proveedor AND ea.nombre_estado_arriendo = 'ACTIVO') AS arriendos_activos,
          (SELECT COALESCE(SUM(pg.monto_pago), 0) FROM Pago pg INNER JOIN Reserva r ON r.ID_reserva = pg.ID_reserva_pago INNER JOIN Vehiculo v ON v.ID_vehiculo = r.ID_vehiculo_reserva INNER JOIN EstadoPago ep ON ep.ID_estado_pago = pg.ID_estado_pago_pago WHERE v.ID_proveedor_vehiculo = p.ID_proveedor AND ep.nombre_estado_pago = 'APROBADO') AS ingresos_aprobados,
          (SELECT AVG(CONVERT(DECIMAL(4,2), res.calificacion_resena)) FROM Resena res INNER JOIN Arriendo a ON a.ID_arriendo = res.ID_arriendo_resena INNER JOIN Reserva r ON r.ID_reserva = a.ID_reserva_arriendo INNER JOIN Vehiculo v ON v.ID_vehiculo = r.ID_vehiculo_reserva WHERE v.ID_proveedor_vehiculo = p.ID_proveedor AND res.activo_resena = 1) AS promedio_resenas
        FROM Proveedor p
        WHERE p.ID_proveedor = @providerId;
      `);

    if (!result.recordset[0]) {
      response.status(404).json({ message: 'Proveedor no encontrado.' });
      return;
    }
    response.json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/configuracion', authenticateToken, async (request, response, next) => {
  const providerId = parseId(request.params.id);
  const body = request.body as {
    permiteDevolucionOtraSede?: boolean;
    permiteEntregaDomicilio?: boolean;
    permiteRetiroDomicilio?: boolean;
    radioMaximoKm?: number | null;
  };

  if (!providerId) {
    response.status(400).json({ message: 'Proveedor invalido.' });
    return;
  }

  const radio = body.radioMaximoKm === null || body.radioMaximoKm === undefined
    ? null
    : Number(body.radioMaximoKm);

  if (radio !== null && (!Number.isFinite(radio) || radio <= 0)) {
    response.status(400).json({ message: 'Radio maximo invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    if (!(await assertProviderAccess(request, response, pool, providerId))) {
      return;
    }

    await pool
      .request()
      .input('providerId', sql.Int, providerId)
      .input('otherBranch', sql.Bit, body.permiteDevolucionOtraSede ?? false)
      .input('delivery', sql.Bit, body.permiteEntregaDomicilio ?? false)
      .input('pickup', sql.Bit, body.permiteRetiroDomicilio ?? false)
      .input('radio', sql.Decimal(8, 2), radio)
      .query(`
        IF EXISTS (
          SELECT 1 FROM ConfiguracionProveedor
          WHERE ID_proveedor_configuracion_proveedor = @providerId
        )
        BEGIN
          UPDATE ConfiguracionProveedor
          SET permite_devolucion_otra_sede = @otherBranch,
              permite_entrega_domicilio = @delivery,
              permite_retiro_domicilio = @pickup,
              radio_maximo_km = @radio
          WHERE ID_proveedor_configuracion_proveedor = @providerId;
        END
        ELSE
        BEGIN
          INSERT INTO ConfiguracionProveedor
          (
            ID_proveedor_configuracion_proveedor,
            permite_devolucion_otra_sede,
            permite_entrega_domicilio,
            permite_retiro_domicilio,
            radio_maximo_km
          )
          VALUES (@providerId, @otherBranch, @delivery, @pickup, @radio);
        END
      `);

    response.json({ message: 'Configuracion actualizada.' });
  } catch (error) {
    next(error);
  }
});

export default router;
