import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  ...(env.smtp.user ? { auth: { user: env.smtp.user, pass: env.smtp.password } } : {}),
});

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = `${env.frontendUrl}/confirmar-cuenta?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: 'Confirma tu cuenta de RentaCar',
    text: `Hola ${name}, confirma tu cuenta en RentaCar usando este enlace: ${verificationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#173b43">
        <h1>Confirma tu cuenta RentaCar</h1>
        <p>Hola ${escapeHtml(name)}, gracias por registrarte.</p>
        <p>Confirma tu correo para activar tu cuenta:</p>
        <p><a href="${verificationUrl}">Confirmar cuenta</a></p>
        <p>Este enlace expira en 24 horas.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${env.frontendUrl}/recuperar?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: 'Restablece tu contraseña de RentaCar',
    text: `Hola ${name}, restablece tu contraseña usando este enlace: ${resetUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#173b43">
        <h1>Restablece tu contraseña</h1>
        <p>Hola ${escapeHtml(name)}, recibimos una solicitud para cambiar tu contraseña.</p>
        <p><a href="${resetUrl}">Crear nueva contraseña</a></p>
        <p>Este enlace expira en una hora. Si no lo solicitaste, ignora este correo.</p>
      </div>
    `,
  });
}

export async function sendPaymentStatusEmail(
  email: string,
  name: string,
  amount: number,
  approved: boolean,
) {
  const status = approved ? 'aprobado' : 'rechazado';
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: `Pago ${status} - RentaCar`,
    text: `Hola ${name}, tu pago de $${amount.toLocaleString('es-CL')} fue ${status}.`,
    html: `<p>Hola ${escapeHtml(name)}, tu pago de <strong>$${amount.toLocaleString('es-CL')}</strong> fue <strong>${status}</strong>.</p>`,
  });
}

export async function sendReservationCancelledEmail(
  email: string,
  name: string,
  reservationId: number,
  refunded: boolean,
) {
  const refundText = refunded ? ' El pago aprobado fue marcado como reembolsado.' : '';
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: `Reserva #${reservationId} cancelada - RentaCar`,
    text: `Hola ${name}, tu reserva #${reservationId} fue cancelada.${refundText}`,
    html: `<p>Hola ${escapeHtml(name)}, tu reserva <strong>#${reservationId}</strong> fue cancelada.${refundText}</p>`,
  });
}

export async function sendProviderStatusEmail(email: string, name: string, status: string) {
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: `Estado de proveedor: ${status} - RentaCar`,
    text: `Hola ${name}, el estado de tu proveedor RentaCar ahora es ${status}.`,
    html: `<p>Hola ${escapeHtml(name)}, el estado de tu proveedor RentaCar ahora es <strong>${escapeHtml(status)}</strong>.</p>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}
