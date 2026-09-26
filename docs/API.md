# API local

Base URL: `http://localhost:3000/api`

Las rutas protegidas usan `Authorization: Bearer <jwt>` y renuevan su sesion automaticamente en el frontend via `POST /auth/refresh` cuando un access token expira (politica de un solo refresh concurrente; sesion borrada si el refresh falla).

## Autenticacion

- `POST /auth/registro`: crea cuenta y envia confirmacion.
- `POST /auth/login`: inicia sesion solo con correo confirmado; devuelve `{ token, refreshToken, user }`.
- `POST /auth/refresh`: rota el refresh token y devuelve un access token nuevo con `{ "refreshToken": "..." }`. Un refresh ya usado o revocado da 401.
- `POST /auth/logout`: revoca la sesion con `{ "refreshToken": "..." }`.
- `GET /auth/confirmar-cuenta?token=...`: confirma correo.
- `POST /auth/reenviar-confirmacion`: reenvia confirmacion con `{ "email": "..." }`.
- `POST /auth/solicitar-recuperacion`: envia enlace con `{ "email": "..." }`.
- `POST /auth/restablecer-contrasena`: restablece y revoca todas las sesiones con `{ "token": "...", "password": "..." }`.
- `GET /auth/perfil`: perfil autenticado.

## Catalogo y reservas

- `GET /vehiculos`: acepta `search`, `priceMax`, `commune`, `region`, `availableFrom`, `availableTo`.
- `GET /vehiculos/:id`: detalle, sedes habilitadas y configuracion de devolucion.
- `GET /vehiculos/:id/resenas`: resenas y promedio.
- `POST /reservas`: crea reserva pendiente.
- `GET /reservas/mis-reservas`: historial del cliente.
- `PATCH /reservas/:id/cancelar`: cancela y reembolsa pago aprobado.

## Pago simulado

- `POST /pagos/simulados/iniciar`: body `{ "reservationId": 1 }`.
- `POST /pagos/simulados/:token/confirmar`: body `{ "aprobado": true }`.
- `GET /reservas/:id/pagos`: pagos de una reserva.

El flujo no procesa tarjetas reales. Genera `buyOrder`, `sessionId` y `tokenWs`, y persiste el estado de la transaccion para impedir doble confirmacion.

## Arriendos

- `GET /arriendos`: lista segun rol.
- `POST /arriendos`: inicia arriendo.
- `POST /arriendos/:id/devolucion`: registra devolucion.
- `POST /arriendos/:id/resenas`: crea resena del cliente.

## Admin

Todas las rutas `/admin` requieren rol `ADMIN`.

- `GET /admin/resumen`
- `GET /admin/proveedores`
- `GET /admin/vehiculos`
- `GET /admin/reservas`
- `GET /admin/reportes/proveedores`
- `GET /admin/reportes/tipos-proveedor`
- `GET /admin/auditoria?tabla=Reserva`

## Proveedores

- `GET /proveedores/me`
- `POST /proveedores`
- `GET/POST /proveedores/:id/sedes`
- `GET/POST /proveedores/:id/vehiculos`
- `GET/POST/DELETE /proveedores/:id/vehiculos/:vehicleId/sedes`
- `GET/POST /proveedores/:id/vehiculos/:vehicleId/movimientos`
- `GET/PATCH /proveedores/:id/configuracion`
