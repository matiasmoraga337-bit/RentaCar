import { Router } from 'express';
import { randomBytes } from 'node:crypto';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';
import { sendPaymentStatusEmail } from '../services/mail.js';

const router = Router();

router.post('/pagos/simulados/iniciar', authenticateToken, async (request, response, next) => {
  const reservationId = Number(request.body?.reservationId);

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    response.status(400).json({ message: 'Reserva invalida.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const reservation = await pool
      .request()
      .input('reservationId', sql.Int, reservationId)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT
          r.ID_reserva,
          r.fecha_inicio_reserva,
          r.fecha_fin_reserva,
          r.precio_diario_aplicado_reserva,
          er.nombre_estado_reserva,
          CONVERT(DECIMAL(12,2), DATEDIFF(DAY, r.fecha_inicio_reserva, r.fecha_fin_reserva) * r.precio_diario_aplicado_reserva) AS monto
        FROM Reserva r
        INNER JOIN EstadoReserva er
          ON er.ID_estado_reserva = r.ID_estado_reserva_reserva
        WHERE r.ID_reserva = @reservationId
          AND r.ID_usuario_cliente_reserva = @userId;
      `);
    const row = reservation.recordset[0];

    if (!row) {
      response.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }
    if (row.nombre_estado_reserva !== 'PENDIENTE') {
      response.status(409).json({ message: 'La reserva no esta disponible para iniciar un pago.' });
      return;
    }

    const existing = await pool
      .request()
      .input('reservationId', sql.Int, reservationId)
      .query(`
        SELECT TOP 1
          buy_order_transaccion_simulada AS buyOrder,
          session_id_transaccion_simulada AS sessionId,
          token_ws_transaccion_simulada AS tokenWs,
          monto_transaccion_simulada AS amount
        FROM PagoTransaccionSimulada
        WHERE ID_reserva_transaccion_simulada = @reservationId
          AND estado_transaccion_simulada = 'CREADA'
        ORDER BY ID_transaccion_simulada DESC;
      `);

    if (existing.recordset[0]) {
      response.json({
        ...existing.recordset[0],
        redirectUrl: `/pago/simulado?token=${existing.recordset[0].tokenWs}`,
      });
      return;
    }

    const tokenWs = randomBytes(32).toString('hex');
    const buyOrder = `RC-${reservationId}-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const sessionId = randomBytes(16).toString('hex');
    await pool
      .request()
      .input('reservationId', sql.Int, reservationId)
      .input('buyOrder', sql.VarChar(100), buyOrder)
      .input('sessionId', sql.VarChar(100), sessionId)
      .input('tokenWs', sql.Char(64), tokenWs)
      .input('amount', sql.Decimal(12, 2), row.monto)
      .query(`
        INSERT INTO PagoTransaccionSimulada
        (
          ID_reserva_transaccion_simulada,
          buy_order_transaccion_simulada,
          session_id_transaccion_simulada,
          token_ws_transaccion_simulada,
          monto_transaccion_simulada
        )
        VALUES (@reservationId, @buyOrder, @sessionId, @tokenWs, @amount);
      `);

    response.status(201).json({
      buyOrder,
      sessionId,
      tokenWs,
      amount: row.monto,
      redirectUrl: `/pago/simulado?token=${tokenWs}`,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pagos/simulados/:token/confirmar', authenticateToken, async (request, response, next) => {
  const token = Array.isArray(request.params.token) ? '' : request.params.token;
  const aprobado = request.body?.aprobado;

  if (!/^[a-f0-9]{64}$/.test(token) || typeof aprobado !== 'boolean') {
    response.status(400).json({ message: 'Token o resultado de pago invalido.' });
    return;
  }

  try {
    const pool = await getDatabasePool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const paymentResult = await transaction
        .request()
        .input('tokenWs', sql.Char(64), token)
        .input('userId', sql.Int, request.user!.id)
        .query(`
          SELECT TOP 1
            t.ID_transaccion_simulada,
            t.ID_reserva_transaccion_simulada AS reservationId,
            t.buy_order_transaccion_simulada AS buyOrder,
            t.monto_transaccion_simulada AS amount,
            t.estado_transaccion_simulada AS status,
            u.email_usuario,
            p.nombres_persona
          FROM PagoTransaccionSimulada t
          INNER JOIN Reserva r
            ON r.ID_reserva = t.ID_reserva_transaccion_simulada
          INNER JOIN Usuario u
            ON u.ID_usuario = r.ID_usuario_cliente_reserva
          INNER JOIN Persona p
            ON p.ID_persona = u.ID_persona_usuario
          WHERE t.token_ws_transaccion_simulada = @tokenWs
            AND r.ID_usuario_cliente_reserva = @userId;
        `);
      const payment = paymentResult.recordset[0];

      if (!payment) {
        await transaction.rollback();
        response.status(404).json({ message: 'Transaccion no encontrada.' });
        return;
      }
      if (payment.status !== 'CREADA') {
        await transaction.rollback();
        response.status(409).json({ message: 'La transaccion ya fue procesada.' });
        return;
      }

      if (!aprobado) {
        await transaction
          .request()
          .input('transactionId', sql.BigInt, payment.ID_transaccion_simulada)
          .query(`
            UPDATE PagoTransaccionSimulada
            SET estado_transaccion_simulada = 'RECHAZADA',
                fecha_respuesta_transaccion_simulada = SYSDATETIME()
            WHERE ID_transaccion_simulada = @transactionId;
          `);
        await transaction.commit();
        sendPaymentStatusEmail(payment.email_usuario, payment.nombres_persona, Number(payment.amount), false)
          .catch((error: unknown) => console.error('No fue posible enviar el correo de pago rechazado.', error));
        response.json({ status: 'RECHAZADA', buyOrder: payment.buyOrder });
        return;
      }

      const methodResult = await transaction.request().query(`
        SELECT TOP 1 ID_metodo_pago
        FROM MetodoPago
        WHERE activo_metodo_pago = 1
        ORDER BY ID_metodo_pago;
      `);
      const methodId = methodResult.recordset[0]?.ID_metodo_pago as number | undefined;
      if (!methodId) throw new Error('No existe un metodo de pago activo.');

      const registered = await transaction
        .request()
        .input('ID_reserva', sql.Int, payment.reservationId)
        .input('ID_metodo_pago', sql.Int, methodId)
        .input('monto_pago', sql.Decimal(12, 2), payment.amount)
        .input('aprobado', sql.Bit, true)
        .input('referencia', sql.VarChar(100), `SIM-${payment.buyOrder}`)
        .execute('sp_RegistrarPago');

      await transaction
        .request()
        .input('transactionId', sql.BigInt, payment.ID_transaccion_simulada)
        .query(`
          UPDATE PagoTransaccionSimulada
          SET estado_transaccion_simulada = 'APROBADA',
              fecha_respuesta_transaccion_simulada = SYSDATETIME()
          WHERE ID_transaccion_simulada = @transactionId;
        `);
      await transaction.commit();
      sendPaymentStatusEmail(payment.email_usuario, payment.nombres_persona, Number(payment.amount), true)
        .catch((error: unknown) => console.error('No fue posible enviar el correo de pago aprobado.', error));
      response.json({ status: 'APROBADA', buyOrder: payment.buyOrder, payment: registered.recordset[0] });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

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
