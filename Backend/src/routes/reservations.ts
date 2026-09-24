import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.post('/', authenticateToken, async (request, response, next) => {
  const body = request.body as {
    idVehiculo?: number;
    idSedeRetiro?: number;
    idSedeDevolucion?: number;
    fechaInicio?: string;
    fechaFin?: string;
    observaciones?: string;
  };

  if (!body.idVehiculo || !body.idSedeRetiro || !body.idSedeDevolucion || !body.fechaInicio || !body.fechaFin) {
    response.status(400).json({ message: 'Vehiculo, sedes y fechas son obligatorios.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('ID_usuario_cliente', sql.Int, request.user!.id)
      .input('ID_vehiculo', sql.Int, body.idVehiculo)
      .input('ID_sede_retiro', sql.Int, body.idSedeRetiro)
      .input('ID_sede_devolucion', sql.Int, body.idSedeDevolucion)
      .input('fecha_inicio', sql.Date, body.fechaInicio)
      .input('fecha_fin', sql.Date, body.fechaFin)
      .input('observaciones', sql.NVarChar(500), body.observaciones?.trim() || null)
      .execute('sp_CrearReserva');

    response.status(201).json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/mis-reservas', authenticateToken, async (request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT d.*
        FROM vw_ReservasDetalle d
        INNER JOIN Reserva r ON r.ID_reserva = d.ID_reserva
        WHERE r.ID_usuario_cliente_reserva = @userId
        ORDER BY d.fecha_inicio_reserva DESC;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, async (request, response, next) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Reserva invalida.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('reservationId', sql.Int, id)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT d.*
        FROM vw_ReservasDetalle d
        INNER JOIN Reserva r ON r.ID_reserva = d.ID_reserva
        WHERE d.ID_reserva = @reservationId
          AND (
            r.ID_usuario_cliente_reserva = @userId
            OR EXISTS (
              SELECT 1
              FROM UsuarioRol ur
              INNER JOIN Rol ro ON ro.ID_rol = ur.ID_rol_usuario_rol
              WHERE ur.ID_usuario_usuario_rol = @userId
                AND ro.nombre_rol = 'ADMIN'
            )
          );
      `);

    if (result.recordset.length === 0) {
      response.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    response.json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancelar', authenticateToken, async (request, response, next) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ message: 'Reserva invalida.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('ID_reserva', sql.Int, id)
      .input('ID_usuario', sql.Int, request.user!.id)
      .execute('sp_CancelarReserva');

    response.json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
