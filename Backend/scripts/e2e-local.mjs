import assert from 'node:assert/strict';

const api = process.env.TEST_API_URL ?? 'http://localhost:3000/api';
const mailpit = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now();
const email = `e2e-${stamp}@rentacar.local`;

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${response.status}: ${data.message ?? url}`);
  return data;
}

const registration = await request(`${api}/auth/registro`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    rut: `${Math.floor(10000000 + Math.random() * 89999999)}-9`,
    nombres: 'E2E Local',
    apellidoPaterno: 'Test',
    email,
    password: 'E2EPassword123',
  }),
});
assert.equal(registration.requiresVerification, true);

const messages = await request(`${mailpit}/api/v1/messages`);
const message = messages.messages.find((candidate) => JSON.stringify(candidate).includes(email));
assert.ok(message, 'No se encontro el correo de confirmacion en Mailpit.');
const detail = await request(`${mailpit}/api/v1/message/${message.ID}`);
const tokenMatch = `${detail.Text ?? ''} ${detail.HTML ?? ''}`.match(/confirmar-cuenta\?token=([a-f0-9]{64})/);
assert.ok(tokenMatch, 'No se encontro el token de confirmacion.');

const confirmation = await request(`${api}/auth/confirmar-cuenta?token=${tokenMatch[1]}`);
assert.match(confirmation.message, /confirmado/);

const login = await request(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: 'E2EPassword123' }),
});
assert.ok(login.token);

const reused = await fetch(`${api}/auth/confirmar-cuenta?token=${tokenMatch[1]}`);
assert.equal(reused.status, 400);
console.log('E2E local de correo y confirmacion: OK');
