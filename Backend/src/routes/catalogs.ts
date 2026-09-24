import { Router } from 'express';

import { getDatabasePool } from '../database/sql.js';

const router = Router();

router.get('/vehiculos', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const [types, brands, models, fuels, transmissions, communes] = await Promise.all([
      pool.request().query(`SELECT ID_tipo_vehiculo, nombre_tipo_vehiculo FROM TipoVehiculo WHERE activo_tipo_vehiculo = 1 ORDER BY nombre_tipo_vehiculo`),
      pool.request().query(`SELECT ID_marca, nombre_marca FROM Marca WHERE activo_marca = 1 ORDER BY nombre_marca`),
      pool.request().query(`SELECT ID_modelo, ID_marca_modelo, nombre_modelo FROM Modelo WHERE activo_modelo = 1 ORDER BY nombre_modelo`),
      pool.request().query(`SELECT ID_tipo_combustible, nombre_tipo_combustible FROM TipoCombustible WHERE activo_tipo_combustible = 1 ORDER BY nombre_tipo_combustible`),
      pool.request().query(`SELECT ID_tipo_transmision, nombre_tipo_transmision FROM TipoTransmision WHERE activo_tipo_transmision = 1 ORDER BY nombre_tipo_transmision`),
      pool.request().query(`SELECT ID_comuna, nombre_comuna FROM Comuna WHERE activo_comuna = 1 ORDER BY nombre_comuna`),
    ]);

    response.json({
      types: types.recordset,
      brands: brands.recordset,
      models: models.recordset,
      fuels: fuels.recordset,
      transmissions: transmissions.recordset,
      communes: communes.recordset,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
