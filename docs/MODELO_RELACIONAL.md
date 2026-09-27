# Modelo relacional RentaCar

Base de datos SQL Server `RentaCarDB` con 38 tablas. El diagrama completo
esta en `RentaCar_IMAGEN_ModeloRelacional.png` (raiz del repo).

El esquema se construye desde cero con `RentaCarDB.sql` y las migraciones
de `migrations/` (ver README, script `npm run db:setup`). No usan prefijo
de esquema: todas las tablas viven en `dbo`.

## Dominios

### Geografia
- `Region` → `Comuna` (1:N), clave unica `nombre_region` y `(region, comuna)`.

### Catalogos de vehiculos
- `TipoVehiculo`, `Marca`, `Modelo`, `TipoCombustible`,
  `TipoTransmision`, `EstadoVehiculo`, `EstadoPublicacionVehiculo`.

## Personas, usuarios y roles

- `Persona` (1:1 con `Usuario`, rut unico).
- `Usuario` (email unico, hash de contrasena, activo, correo confirmado).
- `EmailVerificacion` y `PasswordResetToken`: tokens con hash y expiracion.
- `Rol` (`CLIENTE`, `PROVEEDOR`, `ADMIN`) → `UsuarioRol` (N:N).
- `Sesion`: refresh tokens opacos rotados, con revocacion y ultimo uso.
- `Cliente` (1:0..1 Usuario).

## Proveedores

- `TipoProveedor` (`EMPRESA`, `PERSONA`) y `EstadoProveedor`
  (`PENDIENTE`, `APROBADO`, `SUSPENDIDO`).
- `Proveedor`: nombre comercial, RUT (unico para persona y empresa),
  datos de contacto; se enlaza a `TipoProveedor` y `EstadoProveedor`.
- `ProveedorUsuario` (N:N Proveedor ↔ Usuario) con flag
  `es_administrador_proveedor_usuario` y restriccion de al menos un admin.
- `SedeProveedor`: sedes del proveedor, cada una en una `Comuna`.
- `ConfiguracionProveedor`: configuracion de devolucion por proveedor
  (permite retiro/devolucion en sedes distintas y portero/entrega a domicilio con radio).

## Vehiculos

- `Vehiculo`: pertenece a un `Proveedor`; cataloga `Modelo`, `TipoVehiculo`,
  `TipoCombustible`, `TipoTransmision`; tiene patente y VIN unicos, anio,
  kilometraje, precio diario, estado operativo y estado de publicacion,
  y `ID_sede_actual_vehiculo` (sede donde esta fisicamente).
- `VehiculoSede` (N:N Vehiculo ↔ SedeProveedor): sedes donde el vehiculo puede
  entregarse/devolverse (con flags de entrega/devolucion y fechas).
- `VehiculoComuna` (N:N Vehiculo ↔ Comuna): comunas de operacion del vehiculo.
- `VehiculoFoto`: fotos con una principal.
- `MovimientoVehiculo`: historial de cambios de sede actual.

## Reservas, pagos, arriendos y resenas

- `EstadoReserva` (`PENDIENTE`, `CONFIRMADA`, `CANCELADA`) → `Reserva`
  (cliente + vehiculo + sedes de retiro/devolucion + fechas + precio diario).
- `MetodoPago`, `EstadoPago` (`PENDIENTE`, `APROBADO`, `RECHAZADO`, `REEMBOLSADO`).
- `Pago`: intentos de pago por reserva.
- `PagoTransaccionSimulada`: transaccion Webpay simulada, con `buyOrder`,
  `sessionId` y `tokenWs` unicos y estado `CREADA/APROBADA/RECHAZADA/ABORTADA/REEMBOLSADA`.
- `EstadoArriendo` → `Arriendo` (1:0..1 con Reserva; entrega y devolucion reales).
- `Resena` (1:0..1 con Arriendo; moderada por ADMIN via `activo_resena`).

## Auditoria

- `Auditoria`: log de acciones administrativas y cambios de estado
  (tabla afectada, registro, accion, usuario via `SESSION_CONTEXT`, valores anterior/nuevo).

## Vistas

- `vw_VehiculosPublicados`: vehiculos PUBLICADO con datos de catalogo y sedes.
- `vw_ReservasDetalle`: reservas con datos de cliente, vehiculo y pagos.

## Procedimientos almacenados

- `sp_RegistrarProveedor`: da de alta proveedor EMPRESA/PERSONA con
  asignacion automatica de rol.
- `sp_CrearReserva` / `sp_CancelarReserva`: creacion/cancelacion con reglas
  de no solapamiento y reembolso.
- `sp_RegistrarPago`: registra pago y confirma la reserva.
- `sp_AprobarProveedor` / `sp_PublicarVehiculo`: administracion.
- `sp_IniciarArriendo` / `sp_RegistrarDevolucion`: ciclo operativo del arriendo.
- `sp_CrearResena`: resena del cliente tras la devolucion.
- `sp_ReporteProveedores`: (con cursor) cantidades y totales por proveedor.
- `sp_ReporteTiposProveedor`: conteo de proveedores por tipo.

## Triggers

- Auditoria de cambio de estado en `Reserva` y `Proveedor`.
- Validacion de tipo de proveedor (persona requerida para PERSONA, empresa
  para EMPRESA con razon social y RUT).
- Coherencia de sede actual: el vehiculo siempre debe estar en una sede que
  tenga registrada en `VehiculoSede`; sedes de retiro/devolucion validas.
- Reservas y arriendos: sedes de retiro/devolucion habilitadas para el vehiculo.

## Restricciones destacadas

- Claves unicas: RUT (`UQ_persona_rut`), email (`UQ_usuario_email`),
  patente y VIN de vehiculo, tokens de verificacion/recuperacion/sesion/pago,
  `UQ_arriendo_reserva` y `UQ_resena_arriendo` (una resena por arriendo).
- `UX_proveedor_rut` y `UX_proveedor_persona` garantizan identidad unica de
  proveedores (empresa por RUT, persona por persona).