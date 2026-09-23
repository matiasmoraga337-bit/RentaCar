# Plan de Desarrollo y GitHub - RentaCar

## 1. Proyecto

**RentaCar - Marketplace Multi-Proveedor de Arriendo de Vehículos**

Integrantes:

- Nicolás Lázaro
- Matías Aguirre
- Matías Moraga

## 2. Objetivo del desarrollo

Construir una aplicación web que conecte clientes con proveedores de vehículos, permitiendo buscar vehículos, crear reservas, registrar pagos simulados, gestionar arriendos y publicar reseñas.

Los proveedores podrán administrar vehículos y sedes. Los administradores podrán aprobar proveedores, moderar publicaciones, supervisar reservas y consultar reportes.

## 3. Tecnologías

- Frontend: React, Vite y TypeScript.
- Backend: Node.js, Express y TypeScript.
- Base de datos: Microsoft SQL Server.
- Conexión SQL: biblioteca `mssql`.
- Autenticación: JWT y `bcrypt`.
- Correos: Nodemailer y SMTP de prueba.
- Contenedores: Docker y Docker Compose.
- Gestor de paquetes: npm.
- Control de versiones: Git y GitHub.

No se utilizará ORM. Las consultas se realizarán mediante SQL nativo y procedimientos almacenados.

## 4. Estructura del repositorio

```text
rentacar/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── backend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── database/
│   ├── RentaCarDB.sql
│   ├── 01_schema.sql
│   ├── 02_data.sql
│   ├── 03_views.sql
│   ├── 04_triggers.sql
│   └── 05_procedures.sql
├── docs/
│   ├── modelo-relacional.pdf
│   ├── requerimientos.md
│   └── presentacion.pdf
├── docker-compose.yml
├── README.md
├── .env.example
└── .gitignore
```

## 5. Ramas de GitHub

### Ramas principales

```text
main
develop
```

- `main`: versión estable y presentable.
- `develop`: integración de los avances antes de pasar a `main`.

### Ramas de funcionalidades

```text
feature/database-schema
feature/database-procedures
feature/backend-config
feature/authentication
feature/providers
feature/vehicles
feature/search
feature/reservations
feature/payments
feature/rentals
feature/reviews
feature/admin-panel
feature/reports
feature/email
feature/frontend-layout
feature/frontend-client
feature/frontend-provider
feature/frontend-admin
feature/docker
feature/documentation
```

Cada rama debe crearse desde `develop`:

```bash
```

## 6. Reglas de trabajo

- No realizar cambios directamente sobre `main`.
- No realizar cambios directamente sobre `develop` sin revisión.
- Cada funcionalidad debe desarrollarse en una rama independiente.
- Cada rama debe tener un objetivo específico.
- Crear un Pull Request hacia `develop` al terminar una funcionalidad.
- Revisar los cambios antes de aceptar el Pull Request.
- Resolver conflictos antes de fusionar.
- Eliminar la rama después de integrarla.
- Mantener actualizado el archivo `README.md`.
- No subir contraseñas, tokens, archivos `.env` ni `node_modules`.

## 7. Archivos que no deben subirse

El archivo `.gitignore` debe incluir:

```gitignore
node_modules/
.env
.env.*
!.env.example
dist/
.DS_Store
*.log
```

No subir nunca:

- Contraseñas de SQL Server.
- Credenciales SMTP.
- Secretos JWT.
- Tokens de autenticación.
- Archivos `.env` reales.
- Carpetas `node_modules`.

## 8. Convención de commits

Utilizar commits con el formato:

```text
tipo: descripción breve
```

Tipos permitidos:

- `feat`: nueva funcionalidad.
- `fix`: corrección de errores.
- `refactor`: reorganización sin cambiar funcionalidad.
- `docs`: documentación.
- `test`: pruebas.
- `chore`: configuración o mantenimiento.
- `style`: formato o estilos.
- `perf`: mejora de rendimiento.

Ejemplos:

```text
feat: crear tabla de proveedores
fix: impedir reservas superpuestas
docs: actualizar modelo relacional
test: agregar pruebas de autenticacion
chore: configurar docker compose
```

Los commits deben ser pequeños, claros y representar un solo cambio lógico.

## 9. Fases de desarrollo

## Fase 1: Organización inicial

Objetivo: preparar el repositorio y la forma de trabajo.

Tareas:

- Crear el repositorio en GitHub.
- Agregar a los tres integrantes.
- Crear `main` y `develop`.
- Crear `.gitignore`.
- Crear `README.md`.
- Crear las carpetas principales.
- Documentar las tecnologías.

Commits sugeridos:

```text
chore: crear estructura inicial del repositorio
chore: agregar gitignore del proyecto
docs: crear README inicial
docs: documentar tecnologias seleccionadas
```

## Fase 2: Configuración de Docker

Objetivo: ejecutar SQL Server de forma uniforme para todo el equipo.

Tareas:

- Crear `docker-compose.yml`.
- Configurar SQL Server.
- Configurar volumen persistente.
- Configurar puerto `1433`.
- Documentar el inicio y detención del contenedor.
- Probar la conexión desde SQL Server Management Studio.

Commits sugeridos:

```text
chore: agregar configuracion inicial de docker
chore: configurar sql server con volumen persistente
docs: documentar ejecucion de docker
fix: corregir variables de conexion de sql server
```

Comandos esperados:

```bash
```

## Fase 3: Creación de la base de datos

Objetivo: crear el modelo relacional de RentaCar.

Tareas:

- Crear `RentaCarDB`.
- Crear tablas de geografía.
- Crear personas, usuarios y roles.
- Crear proveedores y usuarios asociados.
- Crear sedes.
- Crear catálogos de vehículos.
- Crear vehículos y disponibilidad.
- Crear reservas y arriendos.
- Crear pagos y reseñas.
- Crear auditoría.
- Agregar claves primarias y foráneas.
- Agregar restricciones `CHECK` y `UNIQUE`.
- Agregar índices.

Commits sugeridos:

```text
feat: crear tablas de geografia
feat: crear tablas de personas usuarios y roles
feat: crear tablas de proveedores y sedes
feat: crear catalogos de vehiculos
feat: crear tabla de vehiculos
feat: crear tablas de disponibilidad y movimientos
feat: crear tablas de reservas y arriendos
feat: crear tablas de pagos y resenas
feat: crear tabla de auditoria
feat: agregar claves foraneas e indices
fix: corregir restricciones de proveedores nullable
```

## Fase 4: Datos iniciales

Objetivo: dejar catálogos básicos para pruebas.

Insertar:

- Roles.
- Tipos de proveedor.
- Estados de proveedor.
- Tipos de vehículo.
- Marcas y modelos.
- Tipos de combustible.
- Tipos de transmisión.
- Estados de vehículo.
- Estados de publicación.
- Estados de reserva.
- Estados de arriendo.
- Métodos de pago.
- Estados de pago.
- Regiones y comunas de prueba.

Commits sugeridos:

```text
feat: insertar catalogos iniciales
feat: insertar datos geograficos de prueba
feat: insertar marcas y modelos de prueba
test: agregar datos iniciales para reservas
```

## Fase 5: Vistas y procedimientos almacenados

Objetivo: centralizar la lógica SQL requerida por la aplicación.

Crear:

- `vw_VehiculosPublicados`.
- `vw_ReservasDetalle`.
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

Validar mediante procedimientos:

- Proveedores empresa y persona natural.
- Vehículos publicados.
- Fechas correctas.
- Fechas de reserva superpuestas.
- Sedes pertenecientes al proveedor.
- Monto correcto del pago.
- Roles y permisos.
- Estados válidos.

Commits sugeridos:

```text
feat: crear vista de vehiculos publicados
feat: crear vista de detalle de reservas
feat: crear procedimiento para registrar proveedores
feat: crear procedimiento para crear reservas
feat: validar reservas con fechas superpuestas
feat: crear procedimiento para registrar pagos
feat: crear procedimientos de arriendo y devolucion
feat: crear procedimiento para registrar resenas
feat: crear reportes de proveedores
```

## Fase 6: Triggers y auditoría

Objetivo: registrar cambios importantes automáticamente.

Crear:

- `trg_auditoria_reserva_estado`.
- `trg_auditoria_proveedor_estado`.

Registrar:

- Tabla afectada.
- Registro afectado.
- Acción.
- Estado anterior.
- Estado nuevo.
- Fecha y hora.
- Usuario del sistema.

Commits sugeridos:

```text
feat: crear trigger de auditoria de reservas
feat: crear trigger de auditoria de proveedores
test: validar registros de auditoria
```

## Fase 7: Backend inicial

Objetivo: crear la API y conectarla con SQL Server.

Tareas:

- Crear el proyecto Node.js.
- Configurar TypeScript.
- Configurar Express.
- Configurar `mssql`.
- Configurar `dotenv`.
- Crear pool de conexión.
- Crear manejo de errores.
- Crear middleware de autenticación.
- Crear middleware de autorización por roles.

Estructura:

```text
backend/src/
├── config/
├── database/
├── routes/
├── controllers/
├── services/
├── middlewares/
├── validators/
└── server.ts
```

Commits sugeridos:

```text
chore: inicializar backend con node y typescript
feat: configurar servidor express
feat: configurar conexion con sql server
feat: agregar variables de entorno
feat: agregar manejo global de errores
feat: crear middleware de autenticacion
feat: crear middleware de autorizacion por roles
```

## Fase 8: Autenticación

Objetivo: permitir el acceso seguro de usuarios.

Endpoints:

```text
POST /api/auth/registro
POST /api/auth/login
GET  /api/auth/perfil
```

Tareas:

- Registrar personas.
- Crear usuarios.
- Generar hashes con bcrypt.
- Validar correo y contraseña.
- Generar JWT.
- Obtener los roles del usuario.
- Proteger rutas privadas.

Commits sugeridos:

```text
feat: crear endpoint de registro
feat: implementar hash de contrasenas
feat: crear endpoint de inicio de sesion
feat: implementar generacion de jwt
feat: proteger rutas privadas
test: agregar pruebas de autenticacion
```

## Fase 9: Módulo de proveedores

Objetivo: permitir la administración de proveedores.

Tareas:

- Registrar empresas.
- Registrar personas naturales.
- Asociar usuarios a proveedores.
- Crear configuración del proveedor.
- Crear sedes.
- Aprobar o suspender proveedores.

Endpoints:

```text
POST  /api/proveedores
GET   /api/proveedores/:id
PUT   /api/proveedores/:id
POST  /api/proveedores/:id/usuarios
POST  /api/proveedores/:id/sedes
PATCH /api/admin/proveedores/:id/estado
```

Commits sugeridos:

```text
feat: crear endpoints de proveedores
feat: registrar proveedores empresa y persona
feat: asociar usuarios a proveedores
feat: crear gestion de sedes
feat: implementar aprobacion de proveedores
test: probar permisos de proveedores
```

## Fase 10: Módulo de vehículos

Objetivo: permitir registrar y publicar vehículos.

Tareas:

- Registrar vehículos.
- Asociar vehículos a proveedores.
- Configurar sede actual.
- Configurar sedes disponibles.
- Configurar comunas de operación.
- Registrar movimientos.
- Publicar vehículos.
- Suspender publicaciones.

Endpoints:

```text
GET   /api/vehiculos
GET   /api/vehiculos/:id
POST  /api/proveedores/:id/vehiculos
PUT   /api/vehiculos/:id
PATCH /api/vehiculos/:id/publicacion
POST  /api/vehiculos/:id/sedes
POST  /api/vehiculos/:id/comunas
```

Commits sugeridos:

```text
feat: crear endpoints de vehiculos
feat: registrar vehiculos de proveedores
feat: configurar disponibilidad por sede
feat: configurar comunas de operacion
feat: registrar movimientos de vehiculos
feat: implementar publicacion de vehiculos
test: validar acceso a vehiculos por proveedor
```

## Fase 11: Búsqueda y catálogo

Objetivo: permitir que los clientes encuentren vehículos.

Filtros:

- Región.
- Comuna.
- Tipo de vehículo.
- Marca.
- Modelo.
- Precio máximo.
- Fecha de inicio.
- Fecha de devolución.
- Sede de retiro.
- Sede de devolución.

Commits sugeridos:

```text
feat: crear catalogo publico de vehiculos
feat: agregar filtros de busqueda
feat: filtrar vehiculos por fechas disponibles
feat: agregar detalle de vehiculo
test: probar filtros de vehiculos
```

## Fase 12: Reservas

Objetivo: permitir crear y administrar reservas.

Tareas:

- Seleccionar vehículo.
- Seleccionar fechas.
- Seleccionar sede de retiro.
- Seleccionar sede de devolución.
- Validar disponibilidad.
- Guardar precio diario aplicado.
- Consultar historial.
- Cancelar reservas.

Endpoints:

```text
POST  /api/reservas
GET   /api/reservas/mis-reservas
GET   /api/reservas/:id
PATCH /api/reservas/:id/cancelar
```

Commits sugeridos:

```text
feat: crear endpoint de reservas
feat: validar disponibilidad de vehiculos
feat: validar sedes de retiro y devolucion
feat: guardar precio aplicado en reserva
feat: crear historial de reservas
feat: implementar cancelacion de reservas
test: probar reservas superpuestas
```

## Fase 13: Pagos simulados

Objetivo: simular pagos y confirmar reservas.

Estados:

```text
PENDIENTE
APROBADO
RECHAZADO
REEMBOLSADO
```

El flujo será:

```text
Reserva Pendiente
        ↓
Pago Pendiente
        ↓
Pago Aprobado
        ↓
Reserva Confirmada
```

Commits sugeridos:

```text
feat: crear endpoint de pagos simulados
feat: aprobar reserva despues del pago
feat: registrar intentos de pago
feat: rechazar pagos simulados
test: validar pagos aprobados y rechazados
```

## Fase 14: Arriendos y devoluciones

Objetivo: registrar la operación real del vehículo.

Al iniciar:

- La reserva debe estar confirmada.
- Se registra kilometraje inicial.
- Se registra combustible inicial.
- El vehículo cambia a `ARRENDADO`.

Al devolver:

- Se registra la sede real de devolución.
- Se registra kilometraje final.
- Se registra combustible final.
- El arriendo cambia a `FINALIZADO`.
- La reserva cambia a `COMPLETADA`.
- El vehículo cambia a `DISPONIBLE`.

Commits sugeridos:

```text
feat: crear endpoint para iniciar arriendo
feat: registrar retiro del vehiculo
feat: crear endpoint para registrar devolucion
feat: actualizar estados de vehiculo y reserva
test: validar flujo completo de arriendo
```

## Fase 15: Reseñas

Objetivo: permitir que el cliente califique un arriendo finalizado.

Validaciones:

- El arriendo pertenece al cliente.
- El arriendo está finalizado.
- El arriendo no tiene una reseña previa.
- La calificación está entre 1 y 5.

Commits sugeridos:

```text
feat: crear endpoint de resenas
feat: validar resenas de arriendos finalizados
feat: agregar moderacion de resenas
test: validar una resena por arriendo
```

## Fase 16: Correos

Objetivo: enviar notificaciones mediante SMTP.

Correos principales:

- Registro de usuario.
- Reserva creada.
- Pago aprobado.
- Reserva confirmada.
- Cancelación.
- Retiro.
- Devolución.

Commits sugeridos:

```text
feat: configurar nodemailer con smtp
feat: enviar correo de confirmacion de reserva
feat: enviar correo de pago aprobado
feat: enviar correo de devolucion
test: validar envio de correos
```

## Fase 17: Frontend base

Objetivo: crear la estructura visual de React.

Tareas:

- Configurar React Router.
- Crear layout público.
- Crear layout privado.
- Crear navegación.
- Crear contexto de autenticación.
- Crear componentes reutilizables.
- Crear sistema visual responsive.

Commits sugeridos:

```text
chore: inicializar frontend con react y vite
feat: configurar rutas del frontend
feat: crear layout publico
feat: crear layout autenticado
feat: crear contexto de autenticacion
style: agregar estilos base de la aplicacion
```

## Fase 18: Pantallas del cliente

Crear:

- Inicio.
- Registro.
- Login.
- Catálogo de vehículos.
- Detalle del vehículo.
- Formulario de reserva.
- Pago simulado.
- Historial.
- Detalle del arriendo.
- Formulario de reseña.

Commits sugeridos:

```text
feat: crear pantalla de registro
feat: crear pantalla de inicio de sesion
feat: crear catalogo de vehiculos
feat: crear detalle de vehiculo
feat: crear formulario de reserva
feat: crear pantalla de pago simulado
feat: crear historial de reservas
feat: crear formulario de resena
```

## Fase 19: Panel del proveedor

Crear:

- Resumen del proveedor.
- Usuarios asociados.
- Sedes.
- Vehículos.
- Disponibilidad.
- Publicaciones.
- Reservas.
- Retiros y devoluciones.

Commits sugeridos:

```text
feat: crear panel del proveedor
feat: gestionar sedes desde el frontend
feat: gestionar vehiculos desde el frontend
feat: gestionar publicaciones del proveedor
feat: mostrar reservas del proveedor
```

## Fase 20: Panel administrativo

Crear:

- Dashboard.
- Usuarios.
- Proveedores.
- Vehículos.
- Reservas.
- Pagos.
- Reseñas.
- Auditoría.
- Reportes.

Commits sugeridos:

```text
feat: crear dashboard administrativo
feat: crear gestion de usuarios
feat: crear gestion de proveedores
feat: crear moderacion de vehiculos
feat: crear moderacion de resenas
feat: crear consulta de auditoria
feat: crear reportes administrativos
```

## Fase 21: Pruebas

Probar base de datos:

- Integridad referencial.
- Proveedores empresa y persona.
- Fechas de reservas.
- Reservas superpuestas.
- Pagos aprobados y rechazados.
- Inicio y devolución de arriendos.
- Reseñas duplicadas.
- Auditoría.
- Reporte con cursor.

Probar backend:

- Respuestas HTTP.
- Validación de datos.
- Autenticación.
- Autorización por roles.
- Acceso de proveedores a sus propios datos.
- Acceso de clientes a sus propias reservas.

Probar frontend:

- Navegación.
- Formularios.
- Mensajes de error.
- Estados de carga.
- Diseño responsive.
- Rutas protegidas.

Commits sugeridos:

```text
test: agregar pruebas de integridad de reservas
test: agregar pruebas de permisos por rol
test: agregar pruebas de pagos
test: agregar pruebas del flujo de arriendo
fix: corregir errores encontrados en pruebas
```

## Fase 22: Documentación final

Actualizar:

- `README.md`.
- Modelo relacional.
- Requerimientos funcionales.
- Requerimientos no funcionales.
- Endpoints.
- Instrucciones de Docker.
- Instrucciones de instalación.
- Variables de entorno.
- Usuarios de prueba.
- Flujo de reservas.

Commits sugeridos:

```text
docs: documentar instalacion del proyecto
docs: documentar endpoints de la api
docs: documentar flujo de reservas y arriendos
docs: actualizar modelo relacional
docs: agregar instrucciones de docker
docs: preparar documentacion de presentacion
```

## Fase 23: Preparación de la entrega

Antes de presentar:

1. Verificar que el repositorio esté actualizado.
2. Verificar que `main` contenga la versión estable.
3. Ejecutar el script SQL desde una base limpia.
4. Levantar SQL Server con Docker.
5. Levantar backend y frontend.
6. Probar el flujo completo.
7. Revisar que no existan secretos en GitHub.
8. Revisar el README.
9. Revisar el modelo relacional.
10. Preparar la presentación.

Commits sugeridos:

```text
chore: preparar version candidata para presentacion
fix: corregir detalles finales de integracion
docs: actualizar README final
release: preparar version 1.0.0
```

## 10. Flujo de Pull Request

Cada integrante debe seguir este flujo:

```bash

# Realizar cambios
git add .
```

Después:

1. Crear un Pull Request hacia `develop`.
2. Explicar qué se modificó.
3. Indicar cómo probarlo.
4. Revisar los archivos modificados.
5. Corregir observaciones.
6. Fusionar el Pull Request.
7. Eliminar la rama cuando ya no sea necesaria.

## 11. Plantilla para Pull Requests

Utilizar esta estructura:

```markdown
## Descripción

<!-- Explicar brevemente el cambio. -->

## Tipo de cambio

- [ ] Nueva funcionalidad
- [ ] Corrección
- [ ] Refactorización
- [ ] Documentación
- [ ] Pruebas

## Cambios realizados

-
-
-

## Forma de probar

1.
2.
3.

## Checklist

- [ ] El código compila.
- [ ] Las pruebas relevantes funcionan.
- [ ] No se subieron secretos.
- [ ] Se actualizó la documentación.
- [ ] El cambio fue probado localmente.
```

## 12. Commits mínimos recomendados por integrante

### Integración y backend

```text
chore: inicializar backend
feat: configurar conexion con sql server
feat: implementar autenticacion
feat: crear middleware de roles
feat: crear endpoints de proveedores
feat: crear endpoints de reservas
feat: crear endpoints de pagos
fix: corregir validacion de reservas superpuestas
```

### Frontend

```text
chore: inicializar frontend
feat: crear layout y navegacion
feat: crear pantallas de autenticacion
feat: crear catalogo de vehiculos
feat: crear flujo de reserva
feat: crear historial del cliente
feat: crear panel del proveedor
feat: crear panel administrativo
style: mejorar diseno responsive
```

### Base de datos y documentación

```text
feat: crear esquema relacional
feat: agregar restricciones e indices
feat: crear procedimientos almacenados
feat: crear triggers de auditoria
feat: crear vista de vehiculos publicados
feat: crear cursor de reportes
test: agregar datos de prueba
docs: documentar modelo relacional
docs: documentar reglas de negocio
```

## 13. Commit final esperado

Antes de la presentación, el historial debería tener commits similares a:

```text
chore: preparar repositorio de rentacar
feat: crear modelo relacional de rentacar
feat: agregar procedimientos almacenados
feat: agregar auditoria y triggers
feat: crear backend api
feat: implementar autenticacion
feat: implementar proveedores y vehiculos
feat: implementar reservas y pagos
feat: implementar arriendos y resenas
feat: crear frontend del cliente
feat: crear panel del proveedor
feat: crear panel administrativo
chore: configurar docker
test: validar flujo completo de arriendo
docs: completar documentacion del proyecto
release: preparar version 1.0.0
```
