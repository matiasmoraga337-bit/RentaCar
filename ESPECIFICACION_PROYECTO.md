# RentaCar - Marketplace Multi-Proveedor de Arriendo de Vehículos

## 1. Integrantes

- Nicolás Lázaro
- Matías Aguirre
- Matías Moraga

## 2. Concepto del proyecto

RentaCar será una plataforma web tipo **Marketplace Multi-Proveedor** para el arriendo de vehículos en distintas regiones de Chile.

RentaCar no será una única empresa propietaria de toda la flota. Será una plataforma tecnológica que conecta:

- Clientes que desean arrendar vehículos.
- Empresas de rent a car que publican sus flotas.
- Personas naturales que publican sus propios vehículos.
- Administradores que controlan y moderan la plataforma.

Ejemplo:

```text
RentaCar Marketplace
│
├── Proveedor 1: Rent a Car Chile SpA
│   ├── Vehículos
│   └── Sedes en distintas ciudades
│
├── Proveedor 2: Autos del Sur Ltda.
│   ├── Vehículos
│   └── Sedes en distintas ciudades
│
└── Proveedor 3: Persona natural
    └── Uno o más vehículos
```

## 3. Objetivo general

Permitir que los clientes busquen y arrienden vehículos publicados por distintos proveedores, mientras que los proveedores puedan registrar, administrar y publicar sus vehículos y los administradores puedan controlar el funcionamiento global del Marketplace.

Flujo principal del cliente:

```text
Registro
  ↓
Inicio de sesión
  ↓
Búsqueda de vehículos
  ↓
Selección de fechas y sedes
  ↓
Reserva
  ↓
Pago
  ↓
Arriendo
  ↓
Reseña
```

## 4. Roles del sistema

Los roles serán administrados mediante las tablas `USUARIO`, `ROL` y `USUARIO_ROL`.

Roles principales:

- `ADMIN`: administra y modera la plataforma.
- `OPERADOR`: apoya la gestión de un proveedor.
- `CLIENTE`: busca, reserva y arrienda vehículos.
- `PROVEEDOR`: administra vehículos y sedes asociadas.

No se creará una tabla independiente `ADMINISTRADOR`. Un administrador será un usuario con el rol `ADMIN`.

Un usuario podrá tener más de un rol.

## 5. Tipos de proveedores

La entidad `PROVEEDOR` debe soportar dos tipos mediante `TIPO_PROVEEDOR`.

### Proveedor empresa

- Puede tener múltiples usuarios asociados.
- Puede tener múltiples sedes.
- Puede publicar muchos vehículos.
- Puede permitir retiro en una sede y devolución en otra.
- Puede trasladar vehículos entre sus sedes.

### Proveedor persona natural

- Puede tener uno o más vehículos.
- Puede tener uno o pocos puntos de entrega.
- Puede definir comunas de operación.
- Puede restringir el retiro y la devolución al mismo punto.

Ambos tipos utilizarán la misma entidad `PROVEEDOR`.

## 6. Arquitectura tecnológica

```text
Frontend React
        │
        │ API REST mediante HTTP y JSON
        ▼
Backend Node.js + Express
        │
        │ SQL nativo mediante mssql
        ▼
SQL Server ejecutado con Docker
```

### Frontend

- React.
- Vite.
- TypeScript.
- React Router.
- CSS o Bootstrap.

### Backend

- Node.js LTS.
- Express.
- TypeScript.
- `mssql` para SQL Server.
- `bcrypt` para contraseñas.
- `jsonwebtoken` para autenticación.
- Nodemailer para SMTP.

### Base de datos

- Microsoft SQL Server.
- Consultas SQL nativas.
- Procedimientos almacenados.
- Triggers.
- Cursores.
- Vistas.
- Transacciones.
- Sin ORM.

### Gestión del proyecto

- npm como gestor de paquetes.
- `nvm-windows` para controlar la versión de Node.js.
- Docker para SQL Server.
- GitHub para control de versiones.

## 7. Modelo relacional

Las tablas se crean directamente en la base de datos `RentaCarDB`, sin utilizar un prefijo de schema como `RentaCar.`.

### Tablas de catálogo

- `Region`
- `Comuna`
- `TipoProveedor`
- `EstadoProveedor`
- `Rol`
- `TipoVehiculo`
- `Marca`
- `Modelo`
- `TipoCombustible`
- `TipoTransmision`
- `EstadoVehiculo`
- `EstadoPublicacionVehiculo`
- `EstadoReserva`
- `EstadoArriendo`
- `MetodoPago`
- `EstadoPago`

### Tablas principales

- `Persona`
- `Usuario`
- `UsuarioRol`
- `Cliente`
- `Proveedor`
- `ProveedorUsuario`
- `ConfiguracionProveedor`
- `SedeProveedor`
- `Vehiculo`

### Tablas asociativas

- `VehiculoSede`
- `VehiculoComuna`

### Tablas transaccionales

- `Reserva`
- `Arriendo`
- `Pago`
- `Resena`
- `MovimientoVehiculo`
- `Auditoria`

## 8. Entidades y relaciones

### Persona y usuario

Una persona puede tener una cuenta de usuario.

```text
PERSONA 1 ─── 1 USUARIO
```

`USUARIO` contendrá información de autenticación y estado de la cuenta. Las contraseñas se almacenarán mediante `bcrypt`.

### Usuarios y roles

```text
USUARIO N ─── N ROL
          mediante USUARIO_ROL
```

Esto permite que un mismo usuario tenga más de un rol.

### Clientes

```text
USUARIO 1 ─── 0..1 CLIENTE
```

Un cliente es un usuario autorizado para realizar reservas y arriendos.

### Proveedores y usuarios

```text
PROVEEDOR N ─── N USUARIO
             mediante PROVEEDOR_USUARIO
```

`PROVEEDOR_USUARIO` debe incluir `es_administrador_proveedor` para identificar al usuario que administra ese proveedor.

### Sedes

```text
PROVEEDOR 1 ─── N SEDE_PROVEEDOR
COMUNA 1 ─── N SEDE_PROVEEDOR
REGION 1 ─── N COMUNA
```

Una empresa puede tener múltiples sedes. Una persona natural puede tener una sede o punto de entrega.

### Vehículos

```text
PROVEEDOR 1 ─── N VEHICULO
MODELO 1 ─── N VEHICULO
MARCA 1 ─── N MODELO
TIPO_VEHICULO 1 ─── N VEHICULO
TIPO_COMBUSTIBLE 1 ─── N VEHICULO
TIPO_TRANSMISION 1 ─── N VEHICULO
ESTADO_VEHICULO 1 ─── N VEHICULO
ESTADO_PUBLICACION_VEHICULO 1 ─── N VEHICULO
```

La marca no se almacenará directamente en `VEHICULO`. Se obtendrá mediante:

```text
VEHICULO → MODELO → MARCA
```

### Disponibilidad por sede

Un vehículo tendrá una sede actual y podrá estar habilitado en varias sedes.

```text
VEHICULO N ─── N SEDE_PROVEEDOR
             mediante VEHICULO_SEDE
```

`VEHICULO_SEDE` debe indicar:

- Si se permite entrega.
- Si se permite devolución.
- Fecha de inicio de vigencia.
- Fecha de término de vigencia.

La sede actual se almacenará como FK en `VEHICULO`.

### Zonas de operación

```text
VEHICULO N ─── N COMUNA
             mediante VEHICULO_COMUNA
```

La región de una zona se obtiene mediante:

```text
VEHICULO_COMUNA → COMUNA → REGION
```

No se duplicará `id_region` en `VEHICULO_COMUNA`.

### Movimientos de vehículos

```text
VEHICULO 1 ─── N MOVIMIENTO_VEHICULO
```

`MOVIMIENTO_VEHICULO` registrará:

- Vehículo.
- Sede de origen.
- Sede de destino.
- Fecha del movimiento.
- Observación.

`VEHICULO.id_sede_actual_vehiculo` representa el estado actual y `MOVIMIENTO_VEHICULO` representa el historial.

### Reservas

```text
CLIENTE 1 ─── N RESERVA
VEHICULO 1 ─── N RESERVA
SEDE_PROVEEDOR 1 ─── N RESERVA, como sede de retiro
SEDE_PROVEEDOR 1 ─── N RESERVA, como sede de devolución
ESTADO_RESERVA 1 ─── N RESERVA
```

Una reserva debe tener:

- Cliente.
- Vehículo.
- Fecha de inicio.
- Fecha de término.
- Sede de retiro.
- Sede de devolución.
- Precio diario aplicado.
- Estado.

Las columnas `id_sede_retiro_reserva` e `id_sede_devolucion_reserva` serán FKs diferentes hacia `SEDE_PROVEEDOR`.

No se crearán tablas separadas `SEDE_RETIRO` y `SEDE_DEVOLUCION`.

### Arriendos

Una reserva representa la intención de arrendar. Un arriendo representa la operación real de entrega y devolución.

```text
RESERVA 1 ─── 0..1 ARRIENDO
```

`ARRIENDO` tendrá una FK única hacia `RESERVA`.

Debe registrar:

- Fecha y hora real de retiro.
- Fecha y hora real de devolución.
- Sede real de retiro.
- Sede real de devolución.
- Kilometraje inicial y final.
- Combustible inicial y final.
- Estado del arriendo.

### Pagos

```text
RESERVA 1 ─── N PAGO
METODO_PAGO 1 ─── N PAGO
ESTADO_PAGO 1 ─── N PAGO
```

Los métodos pueden incluir:

- Tarjeta.
- Transferencia.
- Webpay.

No se almacenarán datos sensibles de tarjetas. Solo se guardará la referencia entregada por el proveedor de pagos.

### Reseñas

```text
ARRIENDO 1 ─── 0..1 RESENA
```

Un arriendo puede tener como máximo una reseña.

La reseña tendrá:

- Calificación entre 1 y 5.
- Comentario.
- Fecha.
- Estado activo.

Solo se podrá crear una reseña después de finalizar el arriendo.

### Auditoría

```text
USUARIO 1 ─── N AUDITORIA
```

`AUDITORIA` registrará:

- Usuario que ejecutó la acción.
- Tabla afectada.
- Registro afectado.
- Acción realizada.
- Fecha y hora.
- Descripción.

## 9. Estados del sistema

### Estado del proveedor

- Pendiente.
- Aprobado.
- Rechazado.
- Suspendido.
- Inactivo.

### Estado operativo del vehículo

- Disponible.
- En mantenimiento.
- Arrendado.
- Fuera de servicio.

### Estado de publicación del vehículo

- Pendiente.
- Publicado.
- Rechazado.
- Suspendido.

El estado operativo y el estado de publicación son conceptos independientes.

Ejemplo:

```text
Estado operativo: Disponible
Estado de publicación: Suspendido
```

Esto significa que el vehículo funciona, pero no está visible en el Marketplace.

### Estado de reserva

- Pendiente.
- Confirmada.
- Cancelada.
- Completada.

### Estado del arriendo

- Activo.
- Finalizado.
- Cancelado.

### Estado del pago

- Pendiente.
- Aprobado.
- Rechazado.
- Reembolsado.

## 10. Reglas de negocio

1. Un vehículo pertenece a un único proveedor.
2. Un proveedor puede tener muchos vehículos.
3. Un proveedor puede tener muchas sedes.
4. Un vehículo tiene una ubicación actual, pero puede estar habilitado en múltiples sedes.
5. Un vehículo puede tener múltiples comunas de operación.
6. Una empresa puede permitir retiro y devolución en sedes diferentes.
7. Una persona natural puede restringir el retiro y devolución al mismo punto.
8. La sede de retiro y la sede de devolución son FKs diferentes hacia `SEDE_PROVEEDOR`.
9. No se deben crear tablas separadas para sedes de retiro y devolución.
10. Un vehículo no puede tener dos reservas pendientes o confirmadas con fechas superpuestas.
11. Una reserva puede generar como máximo un arriendo.
12. Un arriendo puede tener como máximo una reseña.
13. Una reseña solo se puede crear después de completar el arriendo.
14. La calificación de una reseña debe estar entre 1 y 5.
15. El precio aplicado a una reserva debe conservarse aunque cambie el precio del vehículo.
16. El estado operativo del vehículo es independiente del estado de publicación.
17. El administrador puede aprobar, rechazar o suspender proveedores.
18. El administrador puede moderar publicaciones y reseñas.
19. Las operaciones administrativas importantes deben registrarse en `AUDITORIA`.
20. Las contraseñas deben almacenarse mediante hash.

## 11. Validación de fechas

Debe cumplirse:

```text
fecha_fin_reserva > fecha_inicio_reserva
```

No se permitirán reservas pendientes o confirmadas superpuestas para el mismo vehículo.

Esta validación debe implementarse mediante un procedimiento almacenado y una transacción con bloqueos adecuados, utilizando la lógica correspondiente para rangos de fechas.

## 12. Procedimientos almacenados

El script SQL implementa los siguientes procedimientos almacenados:

- `sp_RegistrarProveedor`: registra un proveedor como persona o empresa.
- `sp_CrearReserva`: valida disponibilidad, sedes, proveedor, fechas y crea una reserva pendiente.
- `sp_RegistrarPago`: registra un pago y confirma la reserva cuando el pago es aprobado.
- `sp_AprobarProveedor`: cambia el proveedor al estado aprobado.
- `sp_PublicarVehiculo`: publica un vehículo cuando su proveedor está aprobado.
- `sp_IniciarArriendo`: registra el retiro y cambia el vehículo a arrendado.
- `sp_RegistrarDevolucion`: registra la devolución, completa la reserva y libera el vehículo.
- `sp_CrearResena`: permite al cliente reseñar un arriendo finalizado.
- `sp_ReporteProveedores`: genera un reporte utilizando un cursor.
- `sp_ReporteTiposProveedor`: cuenta proveedores empresa y persona natural.

El procedimiento de creación de reserva debe:

1. Validar que el cliente exista y esté activo.
2. Validar que el proveedor esté aprobado.
3. Validar que el vehículo esté publicado y disponible.
4. Validar que las fechas sean válidas.
5. Validar que el retiro y devolución estén permitidos.
6. Verificar que no exista una reserva confirmada superpuesta.
7. Obtener el precio vigente.
8. Guardar el precio aplicado en la reserva.
9. Crear la reserva dentro de una transacción.

## 13. Trigger

El script implementa triggers para registrar cambios de estado en proveedores y reservas.

Los triggers guardan información en `Auditoria`:

- Estado anterior.
- Estado nuevo.
- Usuario del sistema, cuando se encuentre disponible.
- Fecha y hora.
- Registro modificado.

Los triggers implementados son:

- `trg_auditoria_reserva_estado`.
- `trg_auditoria_proveedor_estado`.

## 14. Cursor

Utilizar un cursor para generar un reporte administrativo de vehículos y proveedores.

El cursor recorre los proveedores registrados y calcula por cada uno:

- Cantidad de vehículos.
- Cantidad de vehículos publicados.
- Cantidad de reservas.
- Total de pagos aprobados.

El cursor se utilizará por requisito académico. En un sistema productivo se podría reemplazar por consultas agrupadas con `GROUP BY`.

## 15. Vistas

El script implementa las siguientes vistas para facilitar las consultas del backend:

### `vw_VehiculosPublicados`

Debe reunir:

- Proveedor.
- Tipo de vehículo.
- Marca.
- Modelo.
- Precio diario.
- Estado operativo.
- Sede actual.
- Comunas de operación.

### `vw_ReservasDetalle`

Debe reunir:

- Cliente.
- Vehículo.
- Proveedor.
- Sede de retiro.
- Sede de devolución.
- Fechas.
- Precio aplicado.
- Estado de reserva.
- Estado de pago.

## 16. API REST

### Autenticación

```text
POST   /api/auth/registro
POST   /api/auth/login
GET    /api/auth/perfil
```

### Catálogos y búsqueda

```text
GET    /api/vehiculos
GET    /api/vehiculos/:id
GET    /api/regiones
GET    /api/comunas
GET    /api/tipos-vehiculo
```

### Proveedores

```text
POST   /api/proveedores
GET    /api/proveedores/:id
PUT    /api/proveedores/:id
POST   /api/proveedores/:id/usuarios
GET    /api/proveedores/:id/vehiculos
```

### Vehículos y sedes

```text
POST   /api/proveedores/:id/vehiculos
PUT    /api/vehiculos/:id
PATCH  /api/vehiculos/:id/publicacion
POST   /api/proveedores/:id/sedes
PUT    /api/sedes/:id
```

### Reservas y arriendos

```text
POST   /api/reservas
GET    /api/reservas/mis-reservas
GET    /api/reservas/:id
PATCH  /api/reservas/:id/cancelar
POST   /api/arriendos
PATCH  /api/arriendos/:id/retiro
PATCH  /api/arriendos/:id/devolucion
```

### Pagos y reseñas

```text
POST   /api/reservas/:id/pagos
GET    /api/reservas/:id/pagos
POST   /api/arriendos/:id/resena
PUT    /api/resenas/:id/moderacion
```

### Administración

```text
GET    /api/admin/usuarios
GET    /api/admin/proveedores
PATCH  /api/admin/proveedores/:id/estado
GET    /api/admin/vehiculos
PATCH  /api/admin/vehiculos/:id/moderacion
GET    /api/admin/reservas
GET    /api/admin/reportes
GET    /api/admin/auditoria
```

Todas las entradas deben validarse en el backend. Las consultas deben utilizar parámetros y nunca concatenar directamente datos del usuario.

## 17. Frontend

### Cliente

- Página principal.
- Registro e inicio de sesión.
- Búsqueda de vehículos.
- Filtros por región, comuna, fechas, tipo y precio.
- Detalle del vehículo.
- Selección de sede de retiro y devolución.
- Creación de reserva.
- Pago.
- Historial de reservas.
- Estado del arriendo.
- Creación de reseña.

### Proveedor

- Registro de proveedor.
- Gestión de usuarios asociados.
- Gestión de sedes.
- Registro de vehículos.
- Configuración de disponibilidad.
- Publicación de vehículos.
- Gestión de reservas.
- Gestión de retiros y devoluciones.

### Administrador

- Panel general.
- Gestión de usuarios.
- Gestión de proveedores.
- Moderación de vehículos.
- Supervisión de reservas.
- Supervisión de pagos.
- Moderación de reseñas.
- Gestión de catálogos.
- Consulta de auditoría.

## 18. Seguridad

- Utilizar `bcrypt` para contraseñas.
- Utilizar JWT para autenticación.
- Validar roles en el backend.
- Utilizar consultas parametrizadas.
- No guardar números completos de tarjetas ni CVV.
- No registrar contraseñas ni tokens en logs.
- Utilizar variables de entorno para credenciales.
- Aplicar validación de entrada.
- Controlar que un proveedor solo modifique sus propios vehículos y sedes.
- Controlar que un cliente solo consulte sus propias reservas.

## 19. Correo electrónico

Utilizar Nodemailer con una cuenta SMTP de prueba.

Enviar correos para:

- Registro de usuario.
- Confirmación de reserva.
- Confirmación de pago.
- Cancelación de reserva.
- Confirmación de retiro.
- Confirmación de devolución.

Las credenciales SMTP deben guardarse en variables de entorno.

## 20. Docker

SQL Server se ejecutará mediante Docker.

Configuración esperada:

```text
SQL Server: localhost:1433
Backend:    localhost:3000
Frontend:   localhost:5173
```

Se puede utilizar Docker Compose con servicios para:

- SQL Server.
- Backend.
- Frontend.

La base de datos debe utilizar un volumen para conservar la información.

## 21. Node.js y npm

Utilizar Node.js LTS y npm.

Se recomienda utilizar `nvm-windows` para que todos los integrantes trabajen con la misma versión de Node.js.

Ejemplo de configuración:

```json
{
  "engines": {
    "node": ">=22 <25",
    "npm": ">=10"
  }
}
```

Cada aplicación puede tener su propio `package.json`:

```text
rentacar/
├── frontend/
│   ├── package.json
│   └── package-lock.json
├── backend/
│   ├── package.json
│   └── package-lock.json
└── database/
```

No se deben subir `node_modules` ni archivos `.env`.

## 22. Variables de entorno

El backend utilizará un archivo `.env` local con variables similares a:

```env
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=RentaCarBD
DB_USER=sa
DB_PASSWORD=clave_local
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=correo_de_prueba
SMTP_PASSWORD=clave_smtp
JWT_SECRET=clave_local
```

El repositorio solo debe incluir `.env.example` sin credenciales reales.

## 23. GitHub

Estructura recomendada:

```text
rentacar/
├── frontend/
├── backend/
├── database/
├── docs/
├── docker-compose.yml
├── README.md
└── .env.example
```

Ramas sugeridas:

```text
main
feature/frontend
feature/backend
feature/database
feature/proveedores
feature/reservas
feature/reportes
```

No subir:

- Contraseñas.
- Tokens JWT.
- Credenciales SMTP.
- Archivos `.env`.
- Contraseñas de SQL Server.
- `node_modules`.

## 24. Requerimientos funcionales

- RF01: Registrar usuarios.
- RF02: Iniciar sesión.
- RF03: Asignar roles a usuarios.
- RF04: Registrar proveedores empresa y persona natural.
- RF05: Asociar usuarios a proveedores.
- RF06: Gestionar sedes de proveedores.
- RF07: Registrar vehículos.
- RF08: Configurar disponibilidad por sede.
- RF09: Configurar comunas de operación.
- RF10: Publicar vehículos.
- RF11: Buscar y filtrar vehículos.
- RF12: Consultar información detallada de un vehículo.
- RF13: Seleccionar fechas y sedes de retiro y devolución.
- RF14: Crear reservas.
- RF15: Impedir reservas superpuestas para un vehículo.
- RF16: Registrar pagos.
- RF17: Consultar historial de reservas.
- RF18: Crear arriendos asociados a reservas.
- RF19: Registrar retiro y devolución.
- RF20: Finalizar arriendos.
- RF21: Crear reseñas después de finalizar un arriendo.
- RF22: Moderar reseñas.
- RF23: Registrar movimientos de vehículos.
- RF24: Gestionar estados de proveedores.
- RF25: Gestionar estados de publicación.
- RF26: Generar reportes administrativos.
- RF27: Registrar acciones importantes en auditoría.

## 25. Requerimientos no funcionales

- La aplicación debe funcionar en un navegador.
- Debe ser responsive.
- La comunicación debe realizarse mediante una API REST.
- La base de datos debe ser SQL Server.
- No se debe utilizar ORM.
- Las consultas deben utilizar SQL nativo.
- Las contraseñas deben almacenarse como hash.
- Debe existir control de acceso por roles.
- Las operaciones críticas deben utilizar transacciones.
- Las credenciales deben manejarse mediante variables de entorno.
- La aplicación debe evitar SQL Injection.
- El código debe almacenarse en GitHub.
- SQL Server debe poder ejecutarse mediante Docker.
- Los datos deben conservarse mediante un volumen de Docker.

## 26. Normalización

El modelo debe estar normalizado hasta la Tercera Forma Normal.

### Primera Forma Normal

- Atributos atómicos.
- Sin grupos repetitivos.
- Sin listas almacenadas en una sola columna.

### Segunda Forma Normal

- Los atributos no clave dependen de la clave completa.
- Especialmente en tablas asociativas como `USUARIO_ROL`, `PROVEEDOR_USUARIO`, `VEHICULO_SEDE` y `VEHICULO_COMUNA`.

### Tercera Forma Normal

- Sin dependencias transitivas innecesarias.

Ejemplos:

```text
VEHICULO → MODELO → MARCA
SEDE_PROVEEDOR → COMUNA → REGION
```

No se deben duplicar esos datos en las tablas transaccionales.

## 27. Convención de nombres

Utilizar nombres consistentes para tablas y columnas.

### Claves primarias

```text
id_usuario
id_proveedor
id_vehiculo
id_reserva
```

### Claves foráneas

La FK debe identificar la entidad relacionada y su contexto cuando sea necesario:

```text
id_persona_usuario
id_proveedor_vehiculo
id_modelo_vehiculo
id_sede_retiro_reserva
id_sede_devolucion_reserva
```

## 28. Fuera del alcance inicial

No es necesario implementar inicialmente:

- GPS en tiempo real.
- Seguimiento del vehículo.
- Gestión mecánica detallada.
- Gestión avanzada de multas.
- Gestión de seguros.
- Facturación electrónica ante el SII.
- Liquidación automática de dinero a proveedores.
- Integración bancaria real.
- Tarifas dinámicas avanzadas.
- Inteligencia artificial para precios.
- Sistema GIS avanzado.

## 29. Entregables

Preparar:

1. Modelo relacional.
2. Diagrama de relaciones y cardinalidades.
3. Script SQL de instalación desde cero.
4. Tablas y restricciones.
5. Datos iniciales.
6. Procedimientos almacenados.
7. Trigger de auditoría.
8. Cursor para reportes.
9. Vistas.
10. Backend API.
11. Frontend React.
12. Configuración Docker.
13. Repositorio GitHub.
14. Documentación README.
15. Presentación académica.

## 30. Estructura sugerida de la presentación

La presentación debe durar aproximadamente 10 minutos y contener:

1. Portada e integrantes.
2. Concepto de RentaCar como Marketplace Multi-Proveedor.
3. Objetivo y alcance.
4. Tipos de usuarios y proveedores.
5. Modelo relacional.
6. Requerimientos funcionales.
7. Reglas de negocio.
8. Lenguajes y tecnologías.
9. Arquitectura frontend, API, backend y SQL Server.
10. Procedimientos almacenados, trigger, cursor y vistas.
11. GitHub, npm y Docker.
12. Conclusión.

## 31. Idea central del proyecto

RentaCar es un Marketplace Multi-Proveedor, no una empresa única propietaria de toda la flota.

```text
Proveedor != RentaCar
```

RentaCar administra la plataforma.

Los proveedores publican vehículos.

Los clientes reservan y arriendan esos vehículos.

Los administradores controlan y moderan la plataforma.

El mismo modelo debe soportar tanto:

```text
Empresa con 100 vehículos y 10 sedes
```

como:

```text
Persona natural con un vehículo y un punto de entrega
```

sin crear dos bases de datos ni estructuras completamente diferentes.
