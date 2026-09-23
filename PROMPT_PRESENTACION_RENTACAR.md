# Prompt para Presentación de Base de Datos - RentaCar

Crea una presentación académica en español sobre el proyecto:

**RentaCar: Marketplace Multi-Proveedor de Arriendo de Vehículos**

## Integrantes

- Nicolás Lázaro
- Matías Aguirre
- Matías Moraga

## Objetivo de la presentación

La presentación debe durar aproximadamente 10 minutos y centrarse principalmente en los tres requisitos solicitados:

1. Construir el modelo relacional del tema.
2. Detallar los requerimientos funcionales asociados al modelo.
3. Definir el lenguaje de programación y la base de datos a utilizar.

También debe explicar brevemente la comunicación entre frontend y backend mediante una API REST.

No inventes tablas, tecnologías ni funcionalidades. Presenta el sistema como un proyecto que será desarrollado, utilizando expresiones como “se desarrollará” y “se implementará”.

## Dirección visual y paleta de colores

Utiliza un estilo limpio, elegante, moderno y académico, inspirado en movilidad, tecnología y confianza.

Mantén el mismo patrón de colores en todas las diapositivas:

- Fondo principal marfil claro: `#F8FAFC`.
- Fondo secundario azul hielo: `#EEF6F7`.
- Títulos y texto principal azul petróleo: `#153B50`.
- Color principal para diagramas y elementos destacados, verde salvia: `#2A9D8F`.
- Color secundario para llamados de atención, coral suave: `#E76F51`.
- Texto secundario gris pizarra: `#475569`.
- Líneas y bordes gris azulado claro: `#CBD5E1`.

Reglas visuales:

- Utilizar marfil como fondo principal.
- Utilizar azul petróleo únicamente en títulos, encabezados y elementos de alta jerarquía.
- Utilizar verde salvia para relaciones, flujos, botones visuales y elementos positivos.
- Utilizar coral suave solamente para destacar reservas, pagos o reglas importantes.
- Utilizar azul hielo en tarjetas y bloques secundarios.
- Utilizar gris pizarra para textos explicativos.
- Mantener el mismo color para cada tipo de elemento en toda la presentación.
- Usar tarjetas con bordes redondeados y sombras muy sutiles.
- Usar tipografía sans-serif moderna y legible.
- Evitar fondos oscuros, colores fluorescentes, degradados excesivos y exceso de elementos.
- Mantener buen espacio en blanco y una jerarquía visual clara.

## Diapositiva 1: Portada

Incluir:

- Nombre del proyecto.
- Subtítulo: Marketplace Multi-Proveedor de Arriendo de Vehículos.
- Integrantes.
- Asignatura: Base de Datos.
- Fecha de presentación.

Utilizar una imagen o ilustración minimalista de un vehículo y una ruta. Aplicar azul petróleo para el título y verde salvia como color de apoyo.

## Diapositiva 2: Concepto general y objetivo

Explicar que RentaCar será una plataforma web tipo Marketplace Multi-Proveedor que conecta:

- Clientes que desean arrendar vehículos.
- Empresas de rent a car que publican sus flotas.
- Personas naturales que publican sus vehículos.
- Administradores que controlan y moderan la plataforma.

Aclarar que RentaCar no será una empresa única propietaria de toda la flota, sino una plataforma tecnológica que conecta clientes y proveedores independientes.

Incluir el objetivo general:

“Desarrollar una plataforma web que permita publicar, buscar, reservar y arrendar vehículos de distintos proveedores, incorporando pagos simulados, reseñas, reportes y auditoría.”

Mostrar el flujo general utilizando tarjetas conectadas con flechas verdes:

```text
Proveedor publica vehículo
        ↓
Cliente busca y selecciona
        ↓
Cliente realiza una reserva
        ↓
Se registra el pago
        ↓
Se genera el arriendo
```

## Diapositiva 3: Modelo relacional - usuarios y proveedores

Construir un diagrama relacional claro y legible con estas tablas:

- `Region`
- `Comuna`
- `SedeProveedor`
- `Persona`
- `Usuario`
- `Rol`
- `UsuarioRol`
- `Cliente`
- `Proveedor`
- `ProveedorUsuario`
- `ConfiguracionProveedor`
- `TipoProveedor`
- `EstadoProveedor`

Mostrar las relaciones:

```text
Region 1:N Comuna
Comuna 1:N SedeProveedor
Persona 1:1 Usuario
Usuario N:N Rol mediante UsuarioRol
Usuario 1:0..1 Cliente
Proveedor N:N Usuario mediante ProveedorUsuario
Proveedor 1:N SedeProveedor
TipoProveedor 1:N Proveedor
EstadoProveedor 1:N Proveedor
```

Explicar que:

- Un proveedor puede ser empresa o persona natural.
- Un proveedor puede tener varios usuarios asociados.
- Una empresa puede tener múltiples sedes.
- Un usuario puede tener uno o más roles.
- El administrador se representa mediante el rol `ADMIN`, no mediante una tabla independiente.

Mostrar las claves primarias y foráneas principales. Utilizar azul petróleo para las entidades principales y verde salvia para las relaciones.

## Diapositiva 4: Modelo relacional - vehículos y operaciones

Continuar el modelo relacional con estas tablas:

- `TipoVehiculo`
- `Marca`
- `Modelo`
- `TipoCombustible`
- `TipoTransmision`
- `EstadoVehiculo`
- `EstadoPublicacionVehiculo`
- `Vehiculo`
- `VehiculoSede`
- `VehiculoComuna`
- `MovimientoVehiculo`
- `EstadoReserva`
- `Reserva`
- `EstadoArriendo`
- `Arriendo`
- `MetodoPago`
- `EstadoPago`
- `Pago`
- `Resena`
- `Auditoria`

Mostrar las relaciones principales:

```text
Proveedor 1:N Vehiculo
Marca 1:N Modelo
Modelo 1:N Vehiculo
Vehiculo N:N SedeProveedor mediante VehiculoSede
Vehiculo N:N Comuna mediante VehiculoComuna
Vehiculo 1:N MovimientoVehiculo
Cliente 1:N Reserva
Vehiculo 1:N Reserva
Reserva 1:0..1 Arriendo
Reserva 1:N Pago
Arriendo 1:0..1 Resena
Usuario 1:N Auditoria
```

Explicar que:

- Un vehículo pertenece a un proveedor.
- Un vehículo puede estar disponible en varias sedes.
- La sede actual y el historial de movimientos son conceptos diferentes.
- Una reserva representa la intención de arrendar.
- Un arriendo representa la entrega y devolución real.
- Una reserva puede tener varios intentos de pago.
- Un arriendo puede tener como máximo una reseña.

Utilizar coral suave para destacar `Reserva`, `Pago` y `Arriendo`.

## Diapositiva 5: Requerimientos funcionales

Detallar los requerimientos funcionales asociados al modelo relacional. Organizarlos en cuatro bloques visuales con fondo azul hielo.

### Usuarios y proveedores

- RF01: Registrar usuarios.
- RF02: Iniciar sesión.
- RF03: Asignar roles a usuarios.
- RF04: Registrar proveedores empresa y persona natural.
- RF05: Asociar usuarios a proveedores.
- RF06: Aprobar o suspender proveedores.
- RF07: Crear y gestionar sedes.

### Vehículos

- RF08: Registrar vehículos.
- RF09: Asociar vehículos a proveedores.
- RF10: Configurar sedes disponibles para un vehículo.
- RF11: Configurar comunas de operación.
- RF12: Publicar o suspender vehículos.
- RF13: Registrar movimientos de vehículos.
- RF14: Buscar y filtrar vehículos.

### Reservas y arriendos

- RF15: Seleccionar fechas de inicio y término.
- RF16: Seleccionar sede de retiro y devolución.
- RF17: Crear reservas.
- RF18: Impedir reservas superpuestas para un mismo vehículo.
- RF19: Guardar el precio diario aplicado a la reserva.
- RF20: Registrar pagos.
- RF21: Confirmar una reserva después de un pago aprobado.
- RF22: Registrar el retiro del vehículo.
- RF23: Registrar la devolución del vehículo.
- RF24: Finalizar el arriendo.

### Reseñas, reportes y auditoría

- RF25: Crear una reseña después de finalizar un arriendo.
- RF26: Moderar reseñas.
- RF27: Consultar reportes administrativos.
- RF28: Registrar acciones importantes en auditoría.

Relacionar visualmente algunos requerimientos con sus tablas:

```text
Usuario + Rol → Autenticación y permisos
Proveedor + SedeProveedor → Gestión de proveedores
Vehiculo + VehiculoSede → Publicación y disponibilidad
Reserva + Pago → Reserva y confirmación
Arriendo + Resena → Devolución y evaluación
Auditoria → Registro de acciones administrativas
```

## Diapositiva 6: Lenguaje de programación y base de datos

Definir claramente las tecnologías seleccionadas.

### Lenguajes

- TypeScript para frontend y backend.
- SQL para consultas y operaciones de base de datos.

### Frontend

- React.
- Vite.
- TypeScript.

### Backend

- Node.js.
- Express.
- TypeScript.

### Base de datos

- Microsoft SQL Server.

### Acceso a datos

- Biblioteca `mssql`.
- Consultas SQL nativas.
- Procedimientos almacenados.
- Sin ORM.

### Justificación

- React permite crear una interfaz web moderna.
- Node.js y Express permiten construir la API REST.
- TypeScript mejora el control de tipos.
- SQL Server permite utilizar relaciones, restricciones, procedimientos almacenados, triggers, cursores y vistas.
- `mssql` permite ejecutar SQL nativo desde el backend.

## Diapositiva 7: Comunicación entre frontend y backend

Mostrar únicamente la arquitectura necesaria:

```text
Frontend React
        ↓ API REST / JSON
Backend Node.js + Express
        ↓ SQL nativo mediante mssql
SQL Server
```

Explicar:

- El frontend muestra las pantallas.
- El backend recibe y valida las solicitudes.
- El backend controla la autenticación y los roles.
- El backend ejecuta SQL nativo o procedimientos almacenados.
- SQL Server almacena la información.
- El frontend nunca se conecta directamente a la base de datos.

## Diapositiva 8: Conclusión

Utilizar esta conclusión:

“RentaCar utilizará un modelo relacional normalizado para representar usuarios, proveedores, vehículos, sedes, reservas, arriendos, pagos y reseñas. La aplicación será desarrollada con React, Node.js, TypeScript y SQL Server, comunicándose mediante una API REST y utilizando SQL nativo sin ORM.”

Como frase final, incluir:

“El diseño conecta el modelo relacional con los requerimientos funcionales y las tecnologías necesarias para implementar la plataforma.”

## Indicaciones finales

- Mantener la presentación entre 8 y 10 diapositivas.
- Priorizar el modelo relacional, sus cardinalidades y los requerimientos funcionales.
- Definir claramente el lenguaje de programación y la base de datos.
- Mostrar claves primarias y foráneas principales.
- No saturar los diagramas con atributos secundarios.
- Utilizar el patrón de colores indicado en todas las diapositivas.
- No presentar la aplicación como terminada.
- Utilizar expresiones como “se desarrollará” y “se implementará”.
- Agregar notas breves del presentador para cada diapositiva.
- Mantener la exposición dentro de 10 minutos.
- No inventar datos, tablas ni tecnologías.
- Mantener un diseño claro, limpio, elegante y consistente.
