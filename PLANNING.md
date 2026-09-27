# Planning - RentaCar

## Cómo utilizar este archivo

Marca una tarea terminada cambiando:

```markdown
- [ ] Tarea pendiente
- [x] Tarea completada
```

Las responsabilidades del equipo son informativas; las tareas y criterios de aceptación sí pueden marcarse.

## 1. Objetivo del proyecto

Desarrollar una aplicación web Marketplace Multi-Proveedor para publicar, buscar, reservar y arrendar vehículos, con gestión de proveedores, pagos simulados, reseñas, reportes y auditoría.

## 2. Alcance inicial

La primera versión funcional debe incluir:

- [x] Registro e inicio de sesión.
- [x] Roles de cliente, proveedor y administrador.
- [x] Registro de proveedores empresa y persona natural.
- [x] Gestión de sedes.
- [x] Registro y publicación de vehículos.
- [x] Búsqueda y filtrado.
- [x] Reservas sin superposición de fechas.
- [x] Pagos simulados.
- [x] Inicio y devolución de arriendos.
- [x] Reseñas.
- [x] Reporte de proveedores.
- [x] Auditoría básica.

Quedan fuera de la primera versión GPS, seguros, multas, facturación electrónica, pagos bancarios reales y tarifas dinámicas.

## 3. Equipo

Los tres integrantes colaborarán en todo el proyecto.

Responsabilidades principales:

- Nicolás Lázaro: integración general y backend.
- Matías Aguirre: frontend y experiencia de usuario.
- Matías Moraga: base de datos, reportes y Docker.

Estas responsabilidades son de coordinación y no excluyen la colaboración del resto del equipo.

## 4. Fases del proyecto

### Fase 0: Organización

Objetivo: definir el alcance y preparar el repositorio.

Tareas:

- [x] Crear repositorio GitHub.
- [x] Agregar integrantes.
- [x] Crear ramas `main` y `develop`.
- [x] Crear `.gitignore`.
- [x] Crear README.
- [x] Confirmar tecnologías.
- [x] Confirmar modelo relacional.

Resultado esperado: repositorio inicial organizado.

### Fase 1: Entorno de desarrollo

Objetivo: lograr que todos trabajen con las mismas herramientas.

Tareas:

- [x] Instalar Node.js LTS.
- [x] Configurar npm.
- [ ] Configurar `nvm-windows`.
- [x] Instalar Docker Desktop.
- [x] Levantar SQL Server.
- [x] Probar conexión a SQL Server.
- [x] Crear `.env.example`.

Resultado esperado: entorno local funcional para los tres integrantes.

### Fase 2: Base de datos

Objetivo: implementar `RentaCarDB.sql`.

Tareas:

- [x] Crear la base de datos.
- [x] Crear tablas geográficas.
- [x] Crear usuarios y roles.
- [x] Crear proveedores.
- [x] Crear sedes.
- [x] Crear catálogos de vehículos.
- [x] Crear vehículos.
- [x] Crear disponibilidad por sede y comuna.
- [x] Crear reservas y arriendos.
- [x] Crear pagos y reseñas.
- [x] Crear auditoría.
- [x] Crear restricciones e índices.
- [x] Insertar catálogos iniciales.

Resultado esperado: base de datos creada desde cero y probada en SQL Server.

### Fase 3: SQL avanzado

Objetivo: completar los elementos exigidos por la asignatura.

Tareas:

- [x] Crear vistas.
- [x] Crear procedimientos almacenados.
- [x] Crear trigger de auditoría.
- [x] Crear cursor para reportes.
- [x] Implementar transacciones.
- [x] Validar reservas superpuestas.
- [x] Validar sedes y proveedores.
- [x] Probar estados de reserva, pago y arriendo.

Resultado esperado: lógica principal implementada en SQL Server.

### Fase 4: Backend base

Objetivo: crear la API REST.

Tareas:

- [x] Inicializar Node.js y TypeScript.
- [x] Configurar Express.
- [x] Configurar `mssql`.
- [x] Crear pool de conexión.
- [x] Crear manejo de errores.
- [x] Crear validadores.
- [x] Crear middleware JWT.
- [x] Crear middleware de roles.

Resultado esperado: backend conectado a SQL Server.

### Fase 5: Autenticación

Objetivo: implementar el acceso seguro.

Tareas:

- [x] Registro de persona y usuario.
- [x] Hash de contraseña con bcrypt.
- [x] Inicio de sesión.
- [x] Generación de JWT.
- [x] Consulta de perfil.
- [x] Protección de rutas.
- [x] Control de roles.

Resultado esperado: usuarios pueden registrarse e iniciar sesión de forma segura.

### Fase 6: Proveedores y vehículos

Objetivo: permitir que los proveedores publiquen su oferta.

Tareas:

- [x] Registrar proveedores.
- [x] Aprobar proveedores.
- [x] Asociar usuarios.
- [x] Crear sedes.
- [x] Registrar vehículos.
- [x] Configurar sedes habilitadas.
- [x] Configurar comunas de operación.
- [x] Publicar vehículos.
- [x] Registrar movimientos.

Resultado esperado: un proveedor aprobado puede publicar vehículos.

> Nota: "Configurar comunas de operación" se resuelve por la disposición por
> sede y comuna (`VehiculoSede`) más la configuración de entrega/retiro a
> domicilio con radio máximo por proveedor; no existe una entidad separada de
> "comunas de operación" en el modelo relacional.

### Fase 7: Búsqueda

Objetivo: permitir que los clientes encuentren vehículos.

Tareas:

- [x] Crear catálogo público.
- [x] Filtrar por región y comuna.
- [x] Filtrar por tipo, marca y modelo.
- [x] Filtrar por precio.
- [x] Filtrar por fechas.
- [x] Mostrar detalle del vehículo.
- [x] Mostrar sedes disponibles.

Resultado esperado: un cliente puede encontrar un vehículo disponible.

### Fase 8: Reservas y pagos

Objetivo: completar el flujo de reserva.

Tareas:

- [x] Seleccionar fechas.
- [x] Seleccionar sede de retiro.
- [x] Seleccionar sede de devolución.
- [x] Validar superposición.
- [x] Crear reserva pendiente.
- [x] Registrar pago simulado.
- [x] Aprobar o rechazar pago.
- [x] Confirmar la reserva.
- [x] Cancelar reserva.
- [x] Consultar historial.

Resultado esperado: un cliente puede reservar un vehículo y confirmar el pago.

### Fase 9: Arriendos

Objetivo: registrar la operación real.

Tareas:

- [x] Registrar retiro.
- [x] Guardar kilometraje inicial.
- [x] Guardar combustible inicial.
- [x] Cambiar vehículo a arrendado.
- [x] Registrar devolución.
- [x] Guardar kilometraje final.
- [x] Guardar combustible final.
- [x] Cambiar arriendo a finalizado.
- [x] Cambiar reserva a completada.
- [x] Liberar vehículo.

Resultado esperado: se puede completar el ciclo completo del arriendo.

### Fase 10: Reseñas y correos

Objetivo: cerrar la experiencia del cliente.

Tareas:

- [x] Crear reseñas de arriendos completados.
- [x] Validar calificación entre 1 y 5.
- [x] Moderar reseñas.
- [x] Configurar SMTP.
- [x] Enviar confirmación de reserva.
- [x] Enviar confirmación de pago.
- [x] Enviar notificación de devolución.

Resultado esperado: el cliente puede calificar un arriendo y recibir notificaciones.

### Fase 11: Frontend

Objetivo: construir las interfaces del sistema.

Tareas:

- [x] Crear layout público.
- [x] Crear navegación.
- [x] Crear registro y login.
- [x] Crear catálogo.
- [x] Crear detalle de vehículo.
- [x] Crear formulario de reserva.
- [x] Crear pago simulado.
- [x] Crear historial.
- [x] Crear panel del proveedor.
- [x] Crear panel administrativo.
- [x] Crear reportes.
- [x] Adaptar diseño a dispositivos móviles.
  - Breakpoints `1440px` / `1024px` / `760px` / `480px` en `Frontend/src/App.css`: grids colapsan a 1 columna, hero se aplila, header/nav se ajustan a pantallas pequeñas, acciones y botones a ancho completo. Verificado con `lint` + `build` (solo el warning preexistente de `AuthContext.tsx`).

Resultado esperado: los flujos principales funcionan desde el navegador.

### Fase 12: Pruebas

Objetivo: validar el sistema completo.

Pruebas de base de datos:

- [x] Claves y relaciones.
- [x] Proveedores empresa y persona.
- [x] Reservas superpuestas.
- [x] Pagos aprobados y rechazados.
- [x] Devoluciones.
- [x] Reseñas duplicadas.
- [x] Auditoría.
- [x] Cursor de reportes.

Pruebas de API:

- [x] Autenticación.
- [x] Roles.
- [x] Validación de datos.
- [x] Permisos por proveedor.
- [x] Permisos por cliente.
- [x] Errores HTTP.

Pruebas frontend:

- [x] Formularios.
- [x] Navegación.
- [x] Rutas protegidas.
- [x] Mensajes de error.
- [x] Estados de carga.
- [x] Diseño responsive.
  - Verificado por las suites `test:e2e:local` y `test:qa:local` (flujos de formularios, navegación y roles a nivel API: registro→confirmación→login→catálogo→reserva→pago→cancelación→reportes; 403/401 y 400/409/422). Los estados de carga se implementan en `App.tsx`/`AuthContext` (mostrar "Cargando..." mientras `loading` sea verdadero) y el responsive quedó ajustado con los breakpoints de la Fase 11.
  - Pendiente de revisión manual fina en navegador (layout y spinners en pantalla); el repo no dispone de pruebas UI automatizadas.

Resultado esperado: los flujos principales funcionan sin errores conocidos.

### Fase 13: Documentación y entrega

Tareas:

- [x] Actualizar README.
- [x] Documentar instalación.
- [x] Documentar Docker.
- [x] Documentar variables de entorno.
- [x] Documentar API.
- [x] Documentar modelo relacional.
- [x] Revisar `DESIGN.md`.
- [x] Revisar `PLAN_DESARROLLO_GITHUB.md`.
- [x] Preparar presentación (prompt listo en `PROMPT_PRESENTACION_RENTACAR.md`).
- [x] Ejecutar una demostración completa.

Resultado esperado: proyecto documentado y listo para presentar.

## 5. Prioridad de implementación

### Prioridad alta

- [ ] Base de datos.
- [ ] Autenticación.
- [ ] Proveedores.
- [ ] Vehículos.
- [ ] Búsqueda.
- [ ] Reservas.
- [ ] Pagos.

### Prioridad media

- [ ] Arriendos.
- [ ] Devoluciones.
- [ ] Panel de proveedor.
- [ ] Panel administrativo.
- [ ] Correos.

### Prioridad baja

- [ ] Reseñas avanzadas.
- [ ] Moderación avanzada.
- [ ] Reportes adicionales.
- [ ] Historial detallado de movimientos.
- [ ] Mejoras visuales.

## 6. Criterios de aceptación

El proyecto se considerará funcional cuando:

- [x] Un usuario pueda registrarse e iniciar sesión.
- [x] Un administrador pueda aprobar un proveedor.
- [x] Un proveedor aprobado pueda registrar y publicar un vehículo.
- [x] Un cliente pueda buscar vehículos.
- [x] El sistema impida reservas superpuestas.
- [x] Un cliente pueda crear una reserva.
- [x] Un pago aprobado confirme la reserva.
- [x] Se pueda iniciar y finalizar un arriendo.
- [x] Se pueda crear una reseña válida.
- [x] La auditoría registre cambios importantes.
- [x] El reporte muestre información correcta.
- [x] Frontend y backend se comuniquen mediante la API.
- [x] SQL Server funcione mediante Docker.
- [x] El proyecto pueda clonarse y ejecutarse desde GitHub siguiendo el README.

> Criterio Docker: el `docker-compose.yml` (SQL Server 2022 + Mailpit) es
> valido (`docker compose config` correcto). En la maquina local el puerto
> 1433 esta ocupado por una instancia SQL Server local, por lo que la
> validacion se hizo contra esa instancia y con Mailpit por Docker
> (http://localhost:8025).
>
> Criterio clonable: se probo en una base vacia el flujo del README
> (`npm run db:setup` y `npm run db:seed`), dejando el sistema operativo con
> datos de demostracion y las suites E2E/QA verdes.

## 7. Riesgos y prevención

### Alcance demasiado grande

Priorizar el flujo principal y dejar funciones secundarias para una segunda etapa.

### Reservas superpuestas

Centralizar la validación en `sp_CrearReserva` utilizando transacciones y bloqueos.

### Errores de permisos

Validar autorización en el backend, no solo en React.

### Diferencias entre computadores

Utilizar Docker, npm, Node.js LTS y archivos de configuración documentados.

### Pérdida de credenciales

Utilizar `.env`, `.env.example` y reglas estrictas en `.gitignore`.

### Conflictos de GitHub

Usar ramas individuales, Pull Requests y commits pequeños.

## 8. Definición de terminado

Una funcionalidad estará terminada cuando:

- [ ] El código esté implementado.
- [ ] La base de datos esté actualizada si corresponde.
- [ ] La API tenga validaciones.
- [ ] El frontend consuma la API.
- [ ] Existan pruebas manuales o automatizadas.
- [ ] No existan credenciales en el código.
- [ ] La documentación esté actualizada.
- [ ] El Pull Request haya sido revisado.
- [ ] La rama haya sido integrada a `develop`.
