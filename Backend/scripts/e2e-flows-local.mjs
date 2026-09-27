import assert from 'node:assert/strict';

const api = process.env.TEST_API_URL ?? 'http://localhost:3000/api';
const mailpit = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? 'adminprueba@rentacar.cl';
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? 'PruebaAdmin123';
const stamp = Date.now();
const email = `flujos-${stamp}@rentacar.local`;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function expectOk(url, options) {
  const { status, data } = await request(url, options);
  assert.ok(status >= 200 && status < 300, `${status}: ${JSON.stringify(data)}`);
  return data;
}

async function login(userEmail, password) {
  return expectOk(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password }),
  });
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function findToken(destination, pattern) {
  const list = await expectOk(`${mailpit}/api/v1/messages`);
  const message = list.messages.find((candidate) => JSON.stringify(candidate).includes(destination));
  assert.ok(message, 'No se encontró el correo esperado en Mailpit.');
  const detail = await expectOk(`${mailpit}/api/v1/message/${message.ID}`);
  const match = `${detail.Text ?? ''} ${detail.HTML ?? ''}`.match(pattern);
  assert.ok(match, 'No se encontró el valor buscado en el correo.');
  return match[1];
}

const registration = await expectOk(`${api}/auth/registro`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    rut: `${Math.floor(10000000 + Math.random() * 89999999)}-9`,
    nombres: 'Flujos E2E',
    apellidoPaterno: 'RentaCar',
    email,
    password: 'FlujosPassword123',
  }),
});
assert.equal(registration.requiresVerification, true);

const verifyToken = await findToken(email, /confirmar-cuenta\?token=([a-f0-9]{64})/);
await expectOk(`${api}/auth/confirmar-cuenta?token=${verifyToken}`);

const session = await login(email, 'FlujosPassword123');
const clientHeaders = authHeaders(session.token);

const catalog = await expectOk(`${api}/vehiculos`);
assert.ok(catalog.items.length > 0, 'No hay vehiculos publicados para probar el flujo.');
const vehicle = catalog.items[0];

const detail = await expectOk(`${api}/vehiculos/${vehicle.ID_vehiculo}`);
const branch = detail.branches.find((candidate) =>
  candidate.disponible_para_entrega !== 0 && (candidate.disponible_para_devolucion ?? 1) !== 0);
assert.ok(branch, 'El vehiculo no tiene sedes operativas.');

const hoy = new Date();
const isoDate = (days) => new Date(hoy.getTime() + days * 86400000).toISOString().slice(0, 10);

async function crearReserva(inicio, fin) {
  return expectOk(`${api}/reservas`, {
    method: 'POST',
    headers: clientHeaders,
    body: JSON.stringify({
      idVehiculo: vehicle.ID_vehiculo,
      idSedeRetiro: branch.ID_sede_proveedor,
      idSedeDevolucion: branch.ID_sede_proveedor,
      fechaInicio: isoDate(inicio),
      fechaFin: isoDate(fin),
    }),
  });
}

const reservaAprobada = await crearReserva(30, 33);
const inicioPago = await expectOk(`${api}/pagos/simulados/iniciar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ reservationId: reservaAprobada.ID_reserva }),
});
assert.match(inicioPago.tokenWs, /^[a-f0-9]{64}$/);

const confirmacion = await expectOk(`${api}/pagos/simulados/${inicioPago.tokenWs}/confirmar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ aprobado: true }),
});
assert.equal(confirmacion.status, 'APROBADA');

const segundaConfirmacion = await request(`${api}/pagos/simulados/${inicioPago.tokenWs}/confirmar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ aprobado: true }),
});
assert.equal(segundaConfirmacion.status, 409, 'La doble confirmacion debio rechazarse.');

const pagosAprobados = await expectOk(`${api}/reservas/${reservaAprobada.ID_reserva}/pagos`, { headers: clientHeaders });
assert.equal(pagosAprobados[0].nombre_estado_pago, 'APROBADO');

const cancelacion = await expectOk(`${api}/reservas/${reservaAprobada.ID_reserva}/cancelar`, {
  method: 'PATCH',
  headers: clientHeaders,
});
assert.equal(cancelacion.nombre_estado_pago, 'REEMBOLSADO');

const pagosReembolsados = await expectOk(`${api}/reservas/${reservaAprobada.ID_reserva}/pagos`, { headers: clientHeaders });
assert.equal(pagosReembolsados[0].nombre_estado_pago, 'REEMBOLSADO');

const reservaRechazada = await crearReserva(45, 48);
const inicioPagoRechazo = await expectOk(`${api}/pagos/simulados/iniciar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ reservationId: reservaRechazada.ID_reserva }),
});
const rechazo = await expectOk(`${api}/pagos/simulados/${inicioPagoRechazo.tokenWs}/confirmar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ aprobado: false }),
});
assert.equal(rechazo.status, 'RECHAZADA');

const adminSession = await login(adminEmail, adminPassword);
const adminHeaders = authHeaders(adminSession.token);

const resumen = await expectOk(`${api}/admin/resumen`, { headers: adminHeaders });
assert.ok(typeof resumen.totals.total_usuarios === 'number');

const usuarios = await expectOk(`${api}/admin/usuarios?page=1&pageSize=5`, { headers: adminHeaders });
assert.ok(Array.isArray(usuarios.items) && typeof usuarios.total === 'number' && usuarios.totalPages >= 1);

const auditoria = await expectOk(`${api}/admin/auditoria?page=1&pageSize=5`, { headers: adminHeaders });
assert.ok(Array.isArray(auditoria.items) && auditoria.totalPages >= 1);

const bandeja = await expectOk(`${mailpit}/api/v1/messages`);
const asuntos = bandeja.messages
  .filter((m) => m.To.some((t) => t.Address === email))
  .map((m) => m.Subject)
  .join(' | ');

assert.ok(asuntos.includes(`Reserva #${reservaAprobada.ID_reserva} cancelada`), 'Falta el correo de cancelacion.');
assert.ok(asuntos.includes('Pago aprobado'), 'Falta el correo de pago aprobado.');
assert.ok(asuntos.includes('Pago rechazado'), 'Falta el correo de pago rechazado.');

await expectOk(`${api}/reservas/${reservaRechazada.ID_reserva}/cancelar`, {
  method: 'PATCH',
  headers: clientHeaders,
});

console.log('E2E de flujos (pago, reembolso, cancelacion y admin): OK');