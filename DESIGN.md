# Diseño Técnico - RentaCar

## 1. Resumen

RentaCar es un Marketplace Multi-Proveedor de arriendo de vehículos. La plataforma conecta clientes con empresas de rent a car y personas naturales que publican sus vehículos.

La plataforma administra usuarios, proveedores, sedes, vehículos, reservas, pagos, arriendos, reseñas y auditoría.

## 2. Arquitectura

```text
Frontend React
        |
        | HTTP / JSON mediante API REST
        v
Backend Node.js + Express
        |
        | SQL nativo mediante mssql
        v
SQL Server en Docker
```

### Frontend

Responsabilidades:

- Mostrar las interfaces.
- Validar formularios de manera inicial.
- Gestionar la navegación.
- Enviar solicitudes a la API.
- Mostrar estados de carga y errores.
- Controlar la interfaz según el rol.

El frontend no se conectará directamente con SQL Server.

### Backend

Responsabilidades:

- Validar datos recibidos.
- Autenticar usuarios.
- Autorizar operaciones según roles.
- Ejecutar SQL parametrizado.
- Ejecutar procedimientos almacenados.
- Controlar transacciones.
- Enviar correos.
- Responder en JSON.

### Base de datos

Responsabilidades:

- Persistir la información.
- Aplicar claves y restricciones.
- Controlar estados y relaciones.
- Ejecutar procedimientos almacenados.
- Ejecutar triggers de auditoría.
- Generar reportes mediante cursores y vistas.

## 3. Tecnologías

- React, Vite y TypeScript.
- Node.js LTS, Express y TypeScript.
- Microsoft SQL Server.
- Biblioteca `mssql`.
- npm.
- Docker y Docker Compose.
- JWT y `bcrypt`.
- Nodemailer y SMTP de prueba.
- GitHub.

No se utilizará ORM. Todas las operaciones de base de datos usarán SQL nativo o procedimientos almacenados.

## 4. Estructura del repositorio

```text
rentacar/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── package-lock.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   └── server.ts
│   ├── package.json
│   └── package-lock.json
├── database/
│   └── RentaCarDB.sql
├── docs/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── DESIGN.md
├── PLANNING.md
├── PLAN_DESARROLLO_GITHUB.md
└── README.md
```

## 5. Roles y autorización

Los roles se almacenan en `Rol` y se relacionan con usuarios mediante `UsuarioRol`.

### Cliente

- Consultar vehículos publicados.
- Crear reservas.
- Registrar pagos.
- Consultar sus reservas.
- Consultar sus arriendos.
- Crear reseñas de arriendos finalizados.

### Proveedor

- Gestionar sus sedes.
- Gestionar sus vehículos.
- Configurar disponibilidad.
- Publicar vehículos.
- Consultar sus reservas.
- Registrar retiros y devoluciones.

### Administrador

- Aprobar proveedores.
- Suspender proveedores.
- Moderar vehículos y publicaciones.
- Moderar reseñas.
- Consultar reservas, pagos y auditoría.
- Ejecutar reportes.

La autorización se comprobará en el backend. Ocultar una opción en React no reemplaza la autorización del servidor.

## 6. Diseño de datos

### Catálogos

```text
Region
Comuna
TipoProveedor
EstadoProveedor
Rol
TipoVehiculo
Marca
Modelo
TipoCombustible
TipoTransmision
EstadoVehiculo
EstadoPublicacionVehiculo
EstadoReserva
EstadoArriendo
MetodoPago
EstadoPago
```

### Entidades principales

```text
Persona
Usuario
UsuarioRol
Cliente
Proveedor
ProveedorUsuario
ConfiguracionProveedor
SedeProveedor
Vehiculo
```

### Entidades transaccionales

```text
Reserva
Arriendo
Pago
Resena
MovimientoVehiculo
Auditoria
```

### Relaciones principales

```text
Persona 1 ─── 1 Usuario
Usuario N ─── N Rol mediante UsuarioRol
Usuario 1 ─── 0..1 Cliente
Proveedor N ─── N Usuario mediante ProveedorUsuario
Proveedor 1 ─── N SedeProveedor
Proveedor 1 ─── N Vehiculo
Vehiculo N ─── N SedeProveedor mediante VehiculoSede
Vehiculo N ─── N Comuna mediante VehiculoComuna
Cliente 1 ─── N Reserva
Vehiculo 1 ─── N Reserva
Reserva 1 ─── 0..1 Arriendo
Reserva 1 ─── N Pago
Arriendo 1 ─── 0..1 Resena
Usuario 1 ─── N Auditoria
```

## 7. Reglas de negocio

- Un proveedor puede ser empresa o persona natural mediante `TipoProveedor`.
- Un proveedor puede tener múltiples usuarios asociados.
- Un vehículo pertenece a un proveedor.
- Una sede pertenece a un proveedor.
- Un vehículo puede habilitarse en varias sedes.
- Un vehículo puede operar en varias comunas.
- Un vehículo no puede tener reservas pendientes o confirmadas superpuestas.
- El precio diario aplicado queda almacenado en la reserva.
- Una reserva confirmada puede generar un único arriendo.
- Un arriendo finalizado permite crear una única reseña.
- La calificación de una reseña debe estar entre 1 y 5.
- Un proveedor debe estar aprobado para publicar vehículos.
- Un cliente solo puede consultar sus propias reservas.
- Un proveedor solo puede modificar sus propios vehículos y sedes.
- Las acciones administrativas importantes deben registrarse en `Auditoria`.

## 8. Flujo de reserva

```text
Cliente busca vehículo
        ↓
Selecciona fechas y sedes
        ↓
sp_CrearReserva
        ↓
Reserva PENDIENTE
        ↓
sp_RegistrarPago
        ↓
Pago APROBADO
        ↓
Reserva CONFIRMADA
        ↓
sp_IniciarArriendo
        ↓
Arriendo ACTIVO
        ↓
sp_RegistrarDevolucion
        ↓
Arriendo FINALIZADO
Reserva COMPLETADA
        ↓
sp_CrearResena
```

## 9. API

### Autenticación

```text
POST /api/auth/registro
POST /api/auth/login
GET  /api/auth/perfil
```

### Vehículos

```text
GET   /api/vehiculos
GET   /api/vehiculos/:id
POST  /api/proveedores/:id/vehiculos
PUT   /api/vehiculos/:id
PATCH /api/vehiculos/:id/publicacion
```

### Reservas y arriendos

```text
POST  /api/reservas
GET   /api/reservas/mis-reservas
GET   /api/reservas/:id
PATCH /api/reservas/:id/cancelar
POST  /api/arriendos
PATCH /api/arriendos/:id/retiro
PATCH /api/arriendos/:id/devolucion
```

### Pagos y reseñas

```text
POST /api/reservas/:id/pagos
GET  /api/reservas/:id/pagos
POST /api/arriendos/:id/resena
PUT  /api/resenas/:id/moderacion
```

## 10. Seguridad

- Contraseñas almacenadas con `bcrypt`.
- JWT para autenticación.
- Consultas parametrizadas mediante `mssql`.
- Validación de entrada en el backend.
- Autorización por roles.
- Variables de entorno para credenciales.
- Sin datos de tarjetas, CVV o secretos en la base de datos.
- Sin secretos en GitHub.
- No registrar contraseñas ni tokens en logs.

## 11. SQL avanzado

### Procedimientos almacenados

- `sp_RegistrarProveedor`.
- `sp_CrearReserva`.
- `sp_RegistrarPago`.
- `sp_AprobarProveedor`.
- `sp_PublicarVehiculo`.
- `sp_IniciarArriendo`.
- `sp_RegistrarDevolucion`.
- `sp_CrearResena`.
- `sp_ReporteProveedores`.
- `sp_ReporteTiposProveedor`.

### Triggers

- `trg_auditoria_reserva_estado`.
- `trg_auditoria_proveedor_estado`.

### Vistas

- `vw_VehiculosPublicados`.
- `vw_ReservasDetalle`.

### Cursor

`sp_ReporteProveedores` utiliza un cursor para recorrer proveedores y calcular vehículos, publicaciones, reservas y pagos aprobados.

## 12. Docker y configuración

```text
SQL Server: localhost:1433
Backend:    localhost:3000
Frontend:   localhost:5173
```

Variables principales:

```env
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=RentaCarDB
DB_USER=sa
DB_PASSWORD=clave_local
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=correo_de_prueba
SMTP_PASSWORD=clave_smtp
JWT_SECRET=clave_local
```

El archivo real `.env` no debe subirse. Solo se debe versionar `.env.example`.

## 13. Decisiones de diseño

- Se utiliza una entidad única `Proveedor` para empresas y personas naturales.
- Se utiliza `UsuarioRol` en lugar de tablas separadas para administradores y proveedores.
- Se utiliza `SedeProveedor` para retiro y devolución.
- Se separan reserva y arriendo porque representan momentos distintos.
- Se separa estado operativo de estado de publicación del vehículo.
- Se conservan los intentos de pago mediante una relación `Reserva 1:N Pago`.
- Se mantiene el historial de movimientos del vehículo.
- Se utiliza SQL nativo porque el proyecto no permite ORM.
- Se utiliza Docker para entregar el mismo entorno a todo el equipo.
