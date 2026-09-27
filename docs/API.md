# API RentaCar

Base URL: `http://localhost:3000/api`

Todas las respuestas son JSON. Las rutas protegidas requieren
`Authorization: Bearer <jwt>` (access token) y renuevan su sesion
automaticamente en el frontend via `POST /auth/refresh` cuando el access
token expira (politica de un solo refresh concurrente; la sesion se borra
si el refresh falla).

Los intentos de autenticacion estan limitados a 60 por ventana de 15
minutos por IP (`429` al superar el limite).

## Autenticacion

- `POST /auth/registro`: crea la cuenta y envia el correo de confirmacion.
  Body: `{ email, password, nombres, apellidoPaterno, apellidoMaterno?, telefono?, rut }`.
- `POST /auth/login`: inicia sesion solo con correo confirmado; devuelve
  `{ token, refreshToken, user }`.
- `POST /auth/refresh`: rota el refresh token con `{ "refreshToken": "..." }`.
  Un refresh ya usado o revocado da `401`.
- `POST /auth/logout`: revoca la sesion con `{ "refreshToken": "..." }`.
- `GET /auth/confirmar-cuenta?token=...`: confirma el correo.
- `POST /auth/reenviar-confirmacion`: reenvia la confirmacion con `{ "email": "..." }`.
- `POST /auth/solicitar-recuperacion`: envia enlace con `{ "email": "..." }`.
- `POST /auth/restablecer-contrasena`: restablece y revoca todas las sesiones
  con `{ "token": "...", "password": "..." }`.
- `POST /auth/cambiar-contrasena`: cambia la clave autenticado con
  `{ "actualPassword": "...", "nuevaPassword": "..." }`.
- `GET /auth/perfil`: perfil autenticado.
- `PATCH /auth/perfil`: actualiza datos de la persona con
  `{ nombres, apellidoPaterno, apellidoMaterno?, telefono? }`.

## Catalogo y vehiculos

- `GET /catalogos/vehiculos`: catalogos de comunas, marcas y modelos para filtros.
- `GET /vehiculos`: catalogo con filtros `search`, `priceMax`, `commune`, `region`, `availableFrom`, `availableTo`.
- `GET /vehiculos/:id`: detalle, sedes habilitadas y configuracion de devolucion.
- `GET /vehiculos/:id/resenas`: resenas aprobadas y promedio.
- `PATCH /vehiculos/:id/publicacion`: cambia el estado de publicacion del
  vehiculo (PUBLICADO/SUSPENDIDO). Acceso: ADMIN o un miembro administrador
  del proveedor que publica el vehiculo. Body: `{ "estado": "..." }`.

## Reservas

- `POST /reservas`: crea una reserva pendiente y envia correo al cliente y al
  administrador del proveedor.
- `GET /reservas/mis-reservas`: historial del cliente autenticado.
- `GET /reservas/:id`: detalle de una reserva propia.
- `PATCH /reservas/:id/cancelar`: cancela, reembolsa el pago aprobado y envia
  correo de cancelacion.

## Pago simulado

- `POST /pagos/simulados/iniciar`: body `{ "reservationId": 1 }`.
- `POST /pagos/simulados/:token/confirmar`: body `{ "aprobado": true }`.
- `GET /reservas/:id/pagos`: pagos de una reserva.

El flujo no procesa tarjetas reales: genera `buyOrder`, `sessionId` y
`tokenWs`, persiste la transaccion y permite reembolsos, de forma que una
transaccion no puede confirmarse dos veces.

## Arriendos

- `GET /arriendos`: lista segun rol (cliente ve los suyos; proveedor ve los de sus vehiculos).
- `POST /arriendos`: inicia el arriendo de una reserva confirmada.
- `POST /arriendos/:id/devolucion`: registra una devolucion, pide configuracion
  de devolucion del proveedor y envia el correo de confirmacion.
- `POST /arriendos/:id/resenas`: crea una resena del cliente.

## Admin

Todas las rutas `/admin` requieren rol `ADMIN`.

- `GET /admin/resumen`: totales y publicaciones.
- `GET /admin/proveedores`: listado de proveedores.
- `GET /admin/vehiculos`: listado de vehiculos.
- `GET /admin/reservas`: listado de reservas.
- `GET /admin/reportes/proveedores`: reporte con cursor (sp) por proveedor.
- `GET /admin/reportes/tipos-proveedor`: conteo EMPRESA/PERSONA.
- `GET /admin/auditoria?tabla=Reserva&page=1&pageSize=10`: log paginado
  `{ items, total, page, pageSize, totalPages }`.
- `GET /admin/usuarios?page=1&pageSize=10`: usuarios paginados.
- `PATCH /admin/usuarios/:id/estado`: activa/suspende con `{ "activo": bool }`.
- `PATCH /admin/usuarios/:id/roles`: asigna roles con `{ "roles": ["ADMIN"] }`.
- `PATCH /admin/proveedores/:id/estado`: aprueba/suspende con `{ "estado": "..." }`.
- `PATCH /admin/vehiculos/:id/publicacion`: publica/suspende con `{ "estado": "..." }`.
- `GET /admin/resenas?page=1&pageSize=50`: bandeja de resenas.
- `PATCH /admin/resenas/:id`: modera con `{ "activo": bool }`.

## Proveedores

Acceso: usuario autenticado y, cuando aplica, miembro (administrador) del
proveedor. La ruta `POST /proveedores` crea el proveedor (EMPRESA o PERSONA)
y asocia al usuario creador como administrador.

- `POST /proveedores`: registra proveedor; devuelve `{ providerId }`.
- `GET /proveedores/me`: proveedor del usuario autenticado.
- `PATCH /proveedores/:id/perfil`: actualiza
  `{ nombreComercial, razonSocial?, rutProveedor?, telefono?, email? }`.
- `GET /proveedores/:id/usuarios`: miembros del proveedor.
- `POST /proveedores/:id/usuarios`: asocia por `{ "email": "..." }`.
- `PATCH /proveedores/:id/usuarios/:userId`: cambia `{ "esAdministrador": bool }`.
- `DELETE /proveedores/:id/usuarios/:userId`: quita un miembro.
- `GET /proveedores/:id/sedes`: sedes del proveedor.
- `POST /proveedores/:id/sedes`: crea sede con
  `{ idComuna, nombre, direccion, telefono?, email? }`; devuelve `{ id }`.
- `GET /proveedores/:id/vehiculos`: flota del proveedor.
- `POST /proveedores/:id/vehiculos`: registra vehiculo con
  `{ idSedeActual, idModelo, idTipoVehiculo, idTipoCombustible, idTipoTransmision, patente, vin, anio, kilometraje, precioDiario }`; devuelve `{ ID_vehiculo }`.
- `PATCH /proveedores/:id/vehiculos/:vehicleId`: edita datos del vehiculo.
- `POST /proveedores/:id/vehiculos/:vehicleId/fotos`: sube foto (multipart).
- `GET /proveedores/:id/vehiculos/:vehicleId/fotos`: fotos del vehiculo.
- `PATCH /proveedores/:id/vehiculos/:vehicleId/fotos/:photoId/principal`: marca foto principal.
- `DELETE /proveedores/:id/vehiculos/:vehicleId/fotos/:photoId`: elimina foto.
- `PATCH /proveedores/:id/estado`: (ADMIN) cambia estado del proveedor.
- `GET /proveedores/:id/vehiculos/:vehicleId/sedes`: sedes habilitadas del vehiculo.
- `POST /proveedores/:id/vehiculos/:vehicleId/sedes`: habilita una sede para el vehiculo.
- `DELETE /proveedores/:id/vehiculos/:vehicleId/sedes/:sedeId`: deshabilita una sede.
- `GET /proveedores/:id/vehiculos/:vehicleId/movimientos`: historial de movimiento del vehiculo.
- `POST /proveedores/:id/vehiculos/:vehicleId/movimiento`: registra un cambio
  de sede actual del vehiculo.
- `GET /proveedores/:id/configuracion`: configuracion de devolucion.
- `PATCH /proveedores/:id/configuracion`: actualiza configuracion de devolucion.
- `GET /proveedores/:id/reporte`: reporte propio del proveedor.

## Errores comunes

- `400`: cuerpo o parametros invalidos.
- `401`: token faltante, invalido o sesion revocada; credenciales invalidas.
- `403`: sin permiso para la accion (rol o pertenencia al proveedor).
- `404`: recurso no encontrado.
- `409`: conflicto de estado (p. ej. usuario ya asociado al proveedor).
- `429`: exceso de intentos de autenticacion.