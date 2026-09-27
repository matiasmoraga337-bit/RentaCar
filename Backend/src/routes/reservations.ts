import { Router } from 'express';

import { getDatabasePool, sql } from '../database/sql.js';
import { authenticateToken } from '../middlewares/auth.js';
import {
  sendNewReservationProviderEmail,
  sendReservationCancelledEmail,
  sendReservationCreatedEmail,
} from '../services/mail.js';

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

    const created = result.recordset[0];

    if (created) {
      const recipients = await pool
        .request()
        .input('reservationId', sql.Int, created.ID_reserva)
        .query(`
          SELECT
            d.email_usuario AS cliente_email,
            d.nombre_cliente,
            CONCAT(d.nombre_marca, ' ', d.nombre_modelo, ' (', d.patente_vehiculo, ')') AS vehiculo,
            CONVERT(NVARCHAR(10), d.fecha_inicio_reserva, 120) AS inicio,
            CONVERT(NVARCHAR(10), d.fecha_fin_reserva, 120) AS fin,
            d.sede_retiro,
            d.sede_devolucion,
            pu.email_usuario AS proveedor_email,
            pu.nombre_contacto
          FROM vw_ReservasDetalle d
          INNER JOIN Proveedor pr ON pr.ID_proveedor = d.ID_proveedor
          LEFT JOIN (
            SELECT u.email_usuario, CONCAT(pe.nombres_persona, ' ', pe.apellido_paterno_persona) AS nombre_contacto, pu2.ID_proveedor_proveedor_usuario
            FROM ProveedorUsuario pu2
            INNER JOIN Usuario u ON u.ID_usuario = pu2.ID_usuario_proveedor_usuario
            INNER JOIN Persona pe ON pe.ID_persona = u.ID_persona_usuario
            WHERE pu2.es_administrador_proveedor_usuario = 1
          ) pu ON pu.ID_proveedor_proveedor_usuario = pr.ID_proveedor
          WHERE d.ID_reserva = @reservationId;
        `);
      const recipient = recipients.recordset[0];

      if (recipient?.cliente_email) {
        sendReservationCreatedEmail(
          recipient.cliente_email,
          recipient.nombre_cliente ?? 'cliente',
          created.ID_reserva,
          recipient.vehiculo ?? '',
          recipient.inicio ?? '',
          recipient.fin ?? '',
          recipient.sede_retiro ?? '',
          recipient.sede_devolucion ?? '',
        ).catch((error: unknown) => console.error('No fue posible enviar el correo de reserva creada.', error));
      }

      if (recipient?.proveedor_email) {
        sendNewReservationProviderEmail(
          recipient.proveedor_email,
          recipient.nombre_contacto ?? 'proveedor',
          created.ID_reserva,
          recipient.vehiculo ?? '',
          recipient.nombre_cliente ?? '',
          recipient.inicio ?? '',
          recipient.fin ?? '',
          recipient.sede_retiro ?? '',
        ).catch((error: unknown) => console.error('No fue posible notificar al proveedor por correo.', error));
      }
    }

    response.status(201).json(created);
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
    const owner = await pool
      .request()
      .input('reservationId', sql.Int, id)
      .input('userId', sql.Int, request.user!.id)
      .query(`
        SELECT u.email_usuario, p.nombres_persona
        FROM Reserva r
        INNER JOIN Usuario u ON u.ID_usuario = r.ID_usuario_cliente_reserva
        INNER JOIN Persona p ON p.ID_persona = u.ID_persona_usuario
        WHERE r.ID_reserva = @reservationId
          AND r.ID_usuario_cliente_reserva = @userId;
      `);

    if (owner.recordset.length === 0) {
      response.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    const result = await pool
      .request()
      .input('ID_reserva', sql.Int, id)
      .input('ID_usuario', sql.Int, request.user!.id)
      .execute('sp_CancelarReserva');

    const paymentWasRefunded = result.recordset[0]?.nombre_estado_pago === 'REEMBOLSADO';
    sendReservationCancelledEmail(
      owner.recordset[0].email_usuario,
      owner.recordset[0].nombres_persona,
      id,
      paymentWasRefunded,
    ).catch((error: unknown) => console.error('No fue posible enviar el correo de cancelacion.', error));

    response.json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
