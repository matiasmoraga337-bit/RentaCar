import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/reservas/:id/pagos', authenticateToken, async (request, response, next) => {
  const reservationId = Number(request.params.id);

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    response.status(400).json({ message: 'Reserva invalida.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const result = await pool
      .request()
      .input('reservationId', sql.Int, reservationId)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT p.ID_pago, p.monto_pago, p.moneda_pago, p.fecha_pago,
               ep.nombre_estado_pago, mp.nombre_metodo_pago,
               p.referencia_proveedor_pago
        FROM Pago p
        INNER JOIN EstadoPago ep ON ep.ID_estado_pago = p.ID_estado_pago_pago
        INNER JOIN MetodoPago mp ON mp.ID_metodo_pago = p.ID_metodo_pago_pago
        INNER JOIN Reserva r ON r.ID_reserva = p.ID_reserva_pago
        WHERE p.ID_reserva_pago = @reservationId
          AND r.ID_usuario_cliente_reserva = @userId
        ORDER BY p.ID_pago DESC;
      `);

    response.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

router.post('/reservas/:id/pagos', authenticateToken, async (request, response, next) => {
  const reservationId = Number(request.params.id);
  const body = request.body as {
    idMetodoPago?: number;
    montoPago?: number;
    aprobado?: boolean;
    referencia?: string;
  };

  if (!Number.isInteger(reservationId) || reservationId <= 0 || !body.idMetodoPago || !body.montoPago || body.aprobado === undefined) {
    response.status(400).json({ message: 'Datos de pago incompletos.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const ownership = await pool
      .request()
      .input('reservationId', sql.Int, reservationId)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT 1
        FROM Reserva
        WHERE ID_reserva = @reservationId
          AND ID_usuario_cliente_reserva = @userId;
      `);

    if (ownership.recordset.length === 0) {
      response.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    const result = await pool
      .request()
      .input('ID_reserva', sql.Int, reservationId)
      .input('ID_metodo_pago', sql.Int, body.idMetodoPago)
      .input('monto_pago', sql.Decimal(12, 2), body.montoPago)
      .input('aprobado', sql.Bit, body.aprobado)
      .input('referencia', sql.VarChar(100), body.referencia?.trim() || null)
      .execute('sp_RegistrarPago');

    response.status(201).json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
