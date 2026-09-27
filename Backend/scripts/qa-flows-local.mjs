import assert from 'node:assert/strict';

const api = process.env.TEST_API_URL ?? 'http://localhost:3000/api';
const mailpit = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const providerEmail = process.env.TEST_PROVIDER_EMAIL ?? 'proveedor.demo1@rentacar.cl';
const providerPassword = process.env.TEST_PROVIDER_PASSWORD ?? 'DemoSeed123!';
const clientEmail = process.env.TEST_CLIENT_EMAIL ?? 'cliente.demo1@rentacar.cl';
const clientPassword = process.env.TEST_CLIENT_PASSWORD ?? 'DemoSeed123!';
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? 'adminprueba@rentacar.cl';
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? 'PruebaAdmin123';

const stamp = Date.now();
const qaEmail = `qa-${stamp}@rentacar.local`;
const qaPassword = 'QaPassword123!';
const qaNewPassword = 'QaPassword456!';
const qaRecoveredPassword = 'QaPassword789!';
const plate = `QA${String(stamp).slice(-6)}`;
const vin = Array.from({ length: 17 }, () =>
  'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Math.floor(Math.random() * 32)]).join('');

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

async function expectStatus(url, options, status) {
  const result = await request(url, options);
  assert.equal(result.status, status, `Esperado ${status}: ${result.status}: ${JSON.stringify(result.data)}`);
  return result.data;
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

const isoDate = (days) => new Date(new Date().getTime() + days * 86400000).toISOString().slice(0, 10);

async function mailpitItem(destination) {
  const list = await expectOk(`${mailpit}/api/v1/messages`);
  const message = list.messages.find((candidate) => candidate.To.some((to) => to.Address === destination));
  assert.ok(message, `No se encontró el correo para ${destination}.`);
  return expectOk(`${mailpit}/api/v1/message/${message.ID}`);
}

async function waitForMail(destination, subjectPart, retries = 8) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const list = await expectOk(`${mailpit}/api/v1/messages`);
    const message = list.messages.find((candidate) =>
      candidate.To.some((to) => to.Address === destination)
      && (candidate.Subject ?? '').includes(subjectPart));
    if (message) return expectOk(`${mailpit}/api/v1/message/${message.ID}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No se encontró el correo "${subjectPart}" para ${destination}.`);
}

console.log('QA bloque 1: login de roles demo');
const providerSession = await login(providerEmail, providerPassword);
const clientSession = await login(clientEmail, clientPassword);
const adminSession = await login(adminEmail, adminPassword);
const providerHeaders = authHeaders(providerSession.token);
const clientHeaders = authHeaders(clientSession.token);
const adminHeaders = authHeaders(adminSession.token);

console.log('QA bloque 2: alta de vehiculo unico del proveedor');
const me = await expectOk(`${api}/proveedores/me`, { headers: providerHeaders });
assert.ok(me.length > 0, 'El proveedor demo no tiene proveedor asociado.');
const providerId = me[0].ID_proveedor;

const catalogs = await expectOk(`${api}/catalogos/vehiculos`);
assert.ok(catalogs.models.length && catalogs.types.length && catalogs.fuels.length && catalogs.transmissions.length);
const sedes = await expectOk(`${api}/proveedores/${providerId}/sedes`, { headers: providerHeaders });
assert.ok(sedes.length > 0, 'El proveedor demo no tiene sedes activas.');
const sede = sedes[0];
const sedeComuna = sede.nombre_comuna;

const created = await expectOk(`${api}/proveedores/${providerId}/vehiculos`, {
  method: 'POST',
  headers: providerHeaders,
  body: JSON.stringify({
    idSedeActual: sede.ID_sede_proveedor,
    idModelo: catalogs.models[0].ID_modelo,
    idTipoVehiculo: catalogs.types[0].ID_tipo_vehiculo,
    idTipoCombustible: catalogs.fuels[0].ID_tipo_combustible,
    idTipoTransmision: catalogs.transmissions[0].ID_tipo_transmision,
    patente: plate,
    vin,
    anio: 2024,
    kilometraje: 15000,
    precioDiario: 45990,
  }),
});
const vehicleId = created.ID_vehiculo;

let fleet = await expectOk(`${api}/proveedores/${providerId}/vehiculos`, { headers: providerHeaders });
let qaVehicle = fleet.find((item) => item.ID_vehiculo === vehicleId);
assert.ok(qaVehicle, 'El vehiculo creado no aparece en la flota.');
assert.equal(qaVehicle.nombre_estado_publicacion_vehiculo, 'PENDIENTE');
assert.equal(qaVehicle.nombre_estado_vehiculo, 'DISPONIBLE');
console.log(`  Vehiculo ${plate} (id ${vehicleId}) creado y pendiente.`);

console.log('QA bloque 3: aprobacion admin y publicacion en catalogo');
await expectOk(`${api}/admin/vehiculos/${vehicleId}/publicacion`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify({ estado: 'PUBLICADO' }),
});

const catalog = await expectOk(`${api}/vehiculos`);
assert.ok(catalog.items.some((item) => item.ID_vehiculo === vehicleId), 'El vehiculo publico no aparece en el catalogo.');
const detail = await expectOk(`${api}/vehiculos/${vehicleId}`);
assert.ok(detail.branches.length > 0, 'El vehiculo no expone sedes en el detalle.');
const reservaBranch = detail.branches.find((branch) =>
  branch.disponible_para_entrega !== 0 && (branch.disponible_para_devolucion ?? 1) !== 0);
assert.ok(reservaBranch, 'El vehiculo no tiene una sede operable de entrega/devolucion.');

const filtered = await expectOk(`${api}/vehiculos?commune=${encodeURIComponent(sedeComuna)}`);
assert.ok(filtered.items.some((item) => item.ID_vehiculo === vehicleId), 'El filtro por comuna no encuentra el vehiculo.');
console.log('  Aprobado, aparece en catalogo, detalle y filtro por comuna.');

console.log('QA bloque 4: reserva pendiente y rechazo de superposicion');
async function crearReserva(inicio, fin) {
  return expectOk(`${api}/reservas`, {
    method: 'POST',
    headers: clientHeaders,
    body: JSON.stringify({
      idVehiculo: vehicleId,
      idSedeRetiro: reservaBranch.ID_sede_proveedor,
      idSedeDevolucion: reservaBranch.ID_sede_proveedor,
      fechaInicio: isoDate(inicio),
      fechaFin: isoDate(fin),
    }),
  });
}

const reserva = await crearReserva(70, 73);
assert.ok(reserva.ID_reserva);
await expectStatus(`${api}/reservas`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({
    idVehiculo: vehicleId,
    idSedeRetiro: reservaBranch.ID_sede_proveedor,
    idSedeDevolucion: reservaBranch.ID_sede_proveedor,
    fechaInicio: isoDate(72),
    fechaFin: isoDate(74),
  }),
}, 409);
await expectStatus(`${api}/reservas`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({
    idVehiculo: vehicleId,
    idSedeRetiro: reservaBranch.ID_sede_proveedor,
    idSedeDevolucion: reservaBranch.ID_sede_proveedor,
    fechaInicio: isoDate(72),
    fechaFin: isoDate(71),
  }),
}, 400);
let reservaDetalle = await expectOk(`${api}/reservas/${reserva.ID_reserva}`, { headers: clientHeaders });
assert.equal(reservaDetalle.nombre_estado_reserva, 'PENDIENTE');
console.log('  Reserva PENDIENTE, solapamiento 409 y fechas invalidas 400.');

console.log('QA bloque 5: pago aprobado y reserva confirmada');
const inicioPago = await expectOk(`${api}/pagos/simulados/iniciar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ reservationId: reserva.ID_reserva }),
});
assert.match(inicioPago.tokenWs, /^[a-f0-9]{64}$/);
const confirmacion = await expectOk(`${api}/pagos/simulados/${inicioPago.tokenWs}/confirmar`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ aprobado: true }),
});
assert.equal(confirmacion.status, 'APROBADA');
reservaDetalle = await expectOk(`${api}/reservas/${reserva.ID_reserva}`, { headers: clientHeaders });
assert.equal(reservaDetalle.nombre_estado_reserva, 'CONFIRMADA');
console.log('  Pago aprobado y reserva CONFIRMADA.');

console.log('QA bloque 6: arriendo completo (retiro y devolucion)');
const iniciado = await expectOk(`${api}/arriendos`, {
  method: 'POST',
  headers: providerHeaders,
  body: JSON.stringify({
    ID_reserva: reserva.ID_reserva,
    ID_sede_retiro_real: reservaBranch.ID_sede_proveedor,
    kilometraje_inicial: 15000,
    combustible_inicial: 75,
  }),
});
assert.ok(iniciado.ID_arriendo);
const arriendoId = iniciado.ID_arriendo;

fleet = await expectOk(`${api}/proveedores/${providerId}/vehiculos`, { headers: providerHeaders });
qaVehicle = fleet.find((item) => item.ID_vehiculo === vehicleId);
assert.equal(qaVehicle.nombre_estado_vehiculo, 'ARRENDADO');

await expectOk(`${api}/arriendos/${arriendoId}/devolucion`, {
  method: 'POST',
  headers: providerHeaders,
  body: JSON.stringify({
    ID_sede_devolucion_real: reservaBranch.ID_sede_proveedor,
    kilometraje_final: 15900,
    combustible_final: 40,
  }),
});

fleet = await expectOk(`${api}/proveedores/${providerId}/vehiculos`, { headers: providerHeaders });
qaVehicle = fleet.find((item) => item.ID_vehiculo === vehicleId);
assert.equal(qaVehicle.nombre_estado_vehiculo, 'DISPONIBLE');

const rentals = await expectOk(`${api}/arriendos`, { headers: providerHeaders });
const rental = rentals.items.find((item) => item.ID_arriendo === arriendoId);
assert.ok(rental, 'El arriendo no aparece en el historial del proveedor.');
assert.equal(rental.nombre_estado_arriendo, 'FINALIZADO');
assert.equal(rental.nombre_estado_reserva, 'COMPLETADA');
reservaDetalle = await expectOk(`${api}/reservas/mis-reservas`, { headers: clientHeaders }).then(
  (items) => items.find((item) => item.ID_reserva === reserva.ID_reserva));
assert.equal(reservaDetalle.nombre_estado_reserva, 'COMPLETADA');
const devolucionMail = await waitForMail(clientEmail, 'Devolucion confirmada');
assert.match(devolucionMail.Text ?? '', new RegExp(plate));
console.log('  Arriendo COMPLETADO, vehiculo liberado, reserva COMPLETADA y correo de devolución enviado.');

console.log('QA bloque 7: resena y regla de duplicado');
const resenaNueva = await expectOk(`${api}/arriendos/${arriendoId}/resenas`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ calificacion: 5, comentario: 'QA integral completo.' }),
});
await expectStatus(`${api}/arriendos/${arriendoId}/resenas`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ calificacion: 4, comentario: 'duplicado' }),
}, 409);

const publicReviews = await expectOk(`${api}/vehiculos/${vehicleId}/resenas`);
assert.equal(publicReviews.total, 1);
assert.equal(publicReviews.promedio, 5);
console.log('  Resena creada, duplicado 409 y promedio 5.');

console.log('QA bloque 8: moderacion admin de resenas');
const bandejaResenas = await expectOk(`${api}/admin/resenas?page=1&pageSize=100`, { headers: adminHeaders });
const moderada = bandejaResenas.items.find((item) => item.patente_vehiculo === plate);
assert.ok(moderada, 'La resena del vehiculo QA no aparece en moderacion.');

await expectOk(`${api}/admin/resenas/${moderada.ID_resena}`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify({ visible: false }),
});
const reviewsOcultas = await expectOk(`${api}/vehiculos/${vehicleId}/resenas`);
assert.equal(reviewsOcultas.total, 0);

await expectOk(`${api}/admin/resenas/${moderada.ID_resena}`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify({ visible: true }),
});
const reviewsVisibles = await expectOk(`${api}/vehiculos/${vehicleId}/resenas`);
assert.equal(reviewsVisibles.total, 1);
console.log('  Resena ocultada (0 en detalle) y restaurada (1 en detalle).');

console.log('QA bloque 9: cambio de contrasena, revocacion y recuperacion');
const qaRegistro = await expectOk(`${api}/auth/registro`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    rut: `${Math.floor(10000000 + Math.random() * 89999999)}-9`,
    nombres: 'QA Integral',
    apellidoPaterno: 'RentaCar',
    email: qaEmail,
    password: qaPassword,
  }),
});
assert.equal(qaRegistro.requiresVerification, true);
const qaConfirmation = await mailpitItem(qaEmail);
const qaTokenMatch = `${qaConfirmation.Text ?? ''} ${qaConfirmation.HTML ?? ''}`.match(/confirmar-cuenta\?token=([a-f0-9]{64})/);
assert.ok(qaTokenMatch, 'No se encontró el token de confirmación del usuario QA.');
await expectOk(`${api}/auth/confirmar-cuenta?token=${qaTokenMatch[1]}`);

const qaSession = await login(qaEmail, qaPassword);
const qaHeaders = authHeaders(qaSession.token);

await expectOk(`${api}/auth/cambiar-contrasena`, {
  method: 'POST',
  headers: qaHeaders,
  body: JSON.stringify({ actualPassword: qaPassword, nuevaPassword: qaNewPassword }),
});
await expectStatus(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: qaEmail, password: qaPassword }),
}, 401);
const qaNuevaSession = await login(qaEmail, qaNewPassword);
assert.ok(qaNuevaSession.token);

await expectOk(`${api}/auth/solicitar-recuperacion`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: qaEmail }),
});
const recoveryMail = await mailpitItem(qaEmail);
const recoveryMatch = `${recoveryMail.Text ?? ''} ${recoveryMail.HTML ?? ''}`.match(/([a-f0-9]{64})/);
assert.ok(recoveryMatch, 'No se encontró el token de recuperación.');
const restablecida = await expectOk(`${api}/auth/restablecer-contrasena`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ token: recoveryMatch[1], password: qaRecoveredPassword }),
});
assert.match(restablecida.message, /iniciar sesion/i);
console.log('  Cambio de contraseña (vieja 401, nueva ok) y recuperación ok.');

console.log('QA bloque 10: centinelas de permisos y validacion');
await expectStatus(`${api}/auth/perfil`, {}, 401);
await expectStatus(`${api}/admin/resumen`, { headers: clientHeaders }, 403);
await expectStatus(`${api}/admin/vehiculos/${vehicleId}/publicacion`, {
  method: 'PATCH',
  headers: providerHeaders,
  body: JSON.stringify({ estado: 'RECHAZADO' }),
}, 403);
await expectStatus(`${api}/arriendos`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({
    ID_reserva: reserva.ID_reserva,
    ID_sede_retiro_real: reservaBranch.ID_sede_proveedor,
    kilometraje_inicial: 100,
    combustible_inicial: 50,
  }),
}, 403);
console.log('  Centinelas 401/403 correctos.');

console.log('QA bloque 11: proveedores empresa y persona via API');
const provEmpresa = await expectOk(`${api}/proveedores`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({
    tipo: 'EMPRESA',
    nombreComercial: `QA Empresa ${stamp}`,
    razonSocial: 'QA Empresa SpA',
    rutProveedor: `77${String(stamp).slice(-8)}-K`,
    telefono: '+56 9 1111 0001',
    email: `empresa-${stamp}@rentacar.local`,
  }),
});
assert.ok(provEmpresa.providerId > 0, 'No se retorno el ID del proveedor EMPRESA.');
const provPersona = await expectOk(`${api}/proveedores`, {
  method: 'POST',
  headers: qaHeaders,
  body: JSON.stringify({
    tipo: 'PERSONA',
    nombreComercial: `QA Persona ${stamp}`,
    telefono: '+56 9 1111 0002',
    email: `persona-${stamp}@rentacar.local`,
  }),
});
assert.ok(provPersona.providerId > 0, 'No se retorno el ID del proveedor PERSONA.');
const inconsistente = await request(`${api}/proveedores`, {
  method: 'POST',
  headers: clientHeaders,
  body: JSON.stringify({ tipo: 'EMPRESA', nombreComercial: 'QA Invalida' }),
});
assert.equal(inconsistente.status, 400, `Empresa sin razon social ni RUT deberia dar 400: ${JSON.stringify(inconsistente.data)}`);
console.log('  EMPRESA y PERSONA creados; empresa incompleta rechazada con 400.');

console.log('\nQA integral de flujos: OK');