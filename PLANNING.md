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

- [ ] Registro e inicio de sesión.
- [ ] Roles de cliente, proveedor y administrador.
- [ ] Registro de proveedores empresa y persona natural.
- [ ] Gestión de sedes.
- [ ] Registro y publicación de vehículos.
- [ ] Búsqueda y filtrado.
- [ ] Reservas sin superposición de fechas.
- [ ] Pagos simulados.
- [ ] Inicio y devolución de arriendos.
- [ ] Reseñas.
- [ ] Reporte de proveedores.
- [ ] Auditoría básica.

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

- [ ] Crear repositorio GitHub.
- [ ] Agregar integrantes.
- [ ] Crear ramas `main` y `develop`.
- [ ] Crear `.gitignore`.
- [ ] Crear README.
- [ ] Confirmar tecnologías.
- [ ] Confirmar modelo relacional.

Resultado esperado: repositorio inicial organizado.

### Fase 1: Entorno de desarrollo

Objetivo: lograr que todos trabajen con las mismas herramientas.

Tareas:

- [ ] Instalar Node.js LTS.
- [ ] Configurar npm.
- [ ] Configurar `nvm-windows`.
- [ ] Instalar Docker Desktop.
- [ ] Levantar SQL Server.
- [ ] Probar conexión a SQL Server.
- [ ] Crear `.env.example`.

Resultado esperado: entorno local funcional para los tres integrantes.

### Fase 2: Base de datos

Objetivo: implementar `RentaCarDB.sql`.

Tareas:

- [ ] Crear la base de datos.
- [ ] Crear tablas geográficas.
- [ ] Crear usuarios y roles.
- [ ] Crear proveedores.
- [ ] Crear sedes.
- [ ] Crear catálogos de vehículos.
- [ ] Crear vehículos.
- [ ] Crear disponibilidad por sede y comuna.
- [ ] Crear reservas y arriendos.
- [ ] Crear pagos y reseñas.
- [ ] Crear auditoría.
- [ ] Crear restricciones e índices.
- [ ] Insertar catálogos iniciales.

Resultado esperado: base de datos creada desde cero y probada en SQL Server.

### Fase 3: SQL avanzado

Objetivo: completar los elementos exigidos por la asignatura.

Tareas:

- [ ] Crear vistas.
- [ ] Crear procedimientos almacenados.
- [ ] Crear trigger de auditoría.
- [ ] Crear cursor para reportes.
- [ ] Implementar transacciones.
- [ ] Validar reservas superpuestas.
- [ ] Validar sedes y proveedores.
- [ ] Probar estados de reserva, pago y arriendo.

Resultado esperado: lógica principal implementada en SQL Server.

### Fase 4: Backend base

Objetivo: crear la API REST.

Tareas:

- [ ] Inicializar Node.js y TypeScript.
- [ ] Configurar Express.
- [ ] Configurar `mssql`.
- [ ] Crear pool de conexión.
- [ ] Crear manejo de errores.
- [ ] Crear validadores.
- [ ] Crear middleware JWT.
- [ ] Crear middleware de roles.

Resultado esperado: backend conectado a SQL Server.

### Fase 5: Autenticación

Objetivo: implementar el acceso seguro.

Tareas:

- [ ] Registro de persona y usuario.
- [ ] Hash de contraseña con bcrypt.
- [ ] Inicio de sesión.
- [ ] Generación de JWT.
- [ ] Consulta de perfil.
- [ ] Protección de rutas.
- [ ] Control de roles.

Resultado esperado: usuarios pueden registrarse e iniciar sesión de forma segura.

### Fase 6: Proveedores y vehículos

Objetivo: permitir que los proveedores publiquen su oferta.

Tareas:

- [ ] Registrar proveedores.
- [ ] Aprobar proveedores.
- [ ] Asociar usuarios.
- [ ] Crear sedes.
- [ ] Registrar vehículos.
- [ ] Configurar sedes habilitadas.
- [ ] Configurar comunas de operación.
- [ ] Publicar vehículos.
- [ ] Registrar movimientos.

Resultado esperado: un proveedor aprobado puede publicar vehículos.

### Fase 7: Búsqueda

Objetivo: permitir que los clientes encuentren vehículos.

Tareas:

- [ ] Crear catálogo público.
- [ ] Filtrar por región y comuna.
- [ ] Filtrar por tipo, marca y modelo.
- [ ] Filtrar por precio.
- [ ] Filtrar por fechas.
- [ ] Mostrar detalle del vehículo.
- [ ] Mostrar sedes disponibles.

Resultado esperado: un cliente puede encontrar un vehículo disponible.

### Fase 8: Reservas y pagos

Objetivo: completar el flujo de reserva.

Tareas:

- [ ] Seleccionar fechas.
- [ ] Seleccionar sede de retiro.
- [ ] Seleccionar sede de devolución.
- [ ] Validar superposición.
- [ ] Crear reserva pendiente.
- [ ] Registrar pago simulado.
- [ ] Aprobar o rechazar pago.
- [ ] Confirmar la reserva.
- [ ] Cancelar reserva.
- [ ] Consultar historial.

Resultado esperado: un cliente puede reservar un vehículo y confirmar el pago.

### Fase 9: Arriendos

Objetivo: registrar la operación real.

Tareas:

- [ ] Registrar retiro.
- [ ] Guardar kilometraje inicial.
- [ ] Guardar combustible inicial.
- [ ] Cambiar vehículo a arrendado.
- [ ] Registrar devolución.
- [ ] Guardar kilometraje final.
- [ ] Guardar combustible final.
- [ ] Cambiar arriendo a finalizado.
- [ ] Cambiar reserva a completada.
- [ ] Liberar vehículo.

Resultado esperado: se puede completar el ciclo completo del arriendo.

### Fase 10: Reseñas y correos

Objetivo: cerrar la experiencia del cliente.

Tareas:

- [ ] Crear reseñas de arriendos completados.
- [ ] Validar calificación entre 1 y 5.
- [ ] Moderar reseñas.
- [ ] Configurar SMTP.
- [ ] Enviar confirmación de reserva.
- [ ] Enviar confirmación de pago.
- [ ] Enviar notificación de devolución.

Resultado esperado: el cliente puede calificar un arriendo y recibir notificaciones.

### Fase 11: Frontend

Objetivo: construir las interfaces del sistema.

Tareas:

- [ ] Crear layout público.
- [ ] Crear navegación.
- [ ] Crear registro y login.
- [ ] Crear catálogo.
- [ ] Crear detalle de vehículo.
- [ ] Crear formulario de reserva.
- [ ] Crear pago simulado.
- [ ] Crear historial.
- [ ] Crear panel del proveedor.
- [ ] Crear panel administrativo.
- [ ] Crear reportes.
- [ ] Adaptar diseño a dispositivos móviles.

Resultado esperado: los flujos principales funcionan desde el navegador.

### Fase 12: Pruebas

Objetivo: validar el sistema completo.

Pruebas de base de datos:

- [ ] Claves y relaciones.
- [ ] Proveedores empresa y persona.
- [ ] Reservas superpuestas.
- [ ] Pagos aprobados y rechazados.
- [ ] Devoluciones.
- [ ] Reseñas duplicadas.
- [ ] Auditoría.
- [ ] Cursor de reportes.

Pruebas de API:

- [ ] Autenticación.
- [ ] Roles.
- [ ] Validación de datos.
- [ ] Permisos por proveedor.
- [ ] Permisos por cliente.
- [ ] Errores HTTP.

Pruebas frontend:

- [ ] Formularios.
- [ ] Navegación.
- [ ] Rutas protegidas.
- [ ] Mensajes de error.
- [ ] Estados de carga.
- [ ] Diseño responsive.

Resultado esperado: los flujos principales funcionan sin errores conocidos.

### Fase 13: Documentación y entrega

Tareas:

- [ ] Actualizar README.
- [ ] Documentar instalación.
- [ ] Documentar Docker.
- [ ] Documentar variables de entorno.
- [ ] Documentar API.
- [ ] Documentar modelo relacional.
- [ ] Revisar `DESIGN.md`.
- [ ] Revisar `PLAN_DESARROLLO_GITHUB.md`.
- [ ] Preparar presentación.
- [ ] Ejecutar una demostración completa.

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

- [ ] Un usuario pueda registrarse e iniciar sesión.
- [ ] Un administrador pueda aprobar un proveedor.
- [ ] Un proveedor aprobado pueda registrar y publicar un vehículo.
- [ ] Un cliente pueda buscar vehículos.
- [ ] El sistema impida reservas superpuestas.
- [ ] Un cliente pueda crear una reserva.
- [ ] Un pago aprobado confirme la reserva.
- [ ] Se pueda iniciar y finalizar un arriendo.
- [ ] Se pueda crear una reseña válida.
- [ ] La auditoría registre cambios importantes.
- [ ] El reporte muestre información correcta.
- [ ] Frontend y backend se comuniquen mediante la API.
- [ ] SQL Server funcione mediante Docker.
- [ ] El proyecto pueda clonarse y ejecutarse desde GitHub siguiendo el README.

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
