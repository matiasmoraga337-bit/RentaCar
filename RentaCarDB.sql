/* ================================================================
   RentaCarDB
   Marketplace multi-proveedor de arriendo de vehiculos
   SQL Server - instalacion desde cero

   Las tablas se crean directamente en la base de datos dbo.
   No se utiliza el prefijo RentaCar. en los nombres de tablas.
   ================================================================ */

USE master;
GO

IF DB_ID(N'RentaCarDB') IS NOT NULL
    THROW 51000, 'La base de datos RentaCarDB ya existe. Use una instancia limpia.', 1;
GO

CREATE DATABASE RentaCarDB;
GO

USE RentaCarDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ================================================================
   1. GEOGRAFIA
   ================================================================ */

CREATE TABLE Region
(
    ID_region INT IDENTITY(1,1) NOT NULL,
    nombre_region NVARCHAR(100) NOT NULL,
    activo_region BIT NOT NULL CONSTRAINT DF_region_activo DEFAULT 1,

    CONSTRAINT PK_region PRIMARY KEY (ID_region),
    CONSTRAINT UQ_region_nombre UNIQUE (nombre_region),
    CONSTRAINT CK_region_nombre CHECK (LEN(LTRIM(RTRIM(nombre_region))) > 0)
);
GO

CREATE TABLE Comuna
(
    ID_comuna INT IDENTITY(1,1) NOT NULL,
    ID_region_comuna INT NOT NULL,
    nombre_comuna NVARCHAR(100) NOT NULL,
    activo_comuna BIT NOT NULL CONSTRAINT DF_comuna_activo DEFAULT 1,

    CONSTRAINT PK_comuna PRIMARY KEY (ID_comuna),
    CONSTRAINT FK_comuna_region
        FOREIGN KEY (ID_region_comuna) REFERENCES Region(ID_region),
    CONSTRAINT UQ_comuna_region_nombre
        UNIQUE (ID_region_comuna, nombre_comuna),
    CONSTRAINT CK_comuna_nombre CHECK (LEN(LTRIM(RTRIM(nombre_comuna))) > 0)
);
GO

/* ================================================================
   2. PERSONAS, USUARIOS Y ROLES
   ================================================================ */

CREATE TABLE Persona
(
    ID_persona INT IDENTITY(1,1) NOT NULL,
    rut_persona VARCHAR(12) NOT NULL,
    nombres_persona NVARCHAR(80) NOT NULL,
    apellido_paterno_persona NVARCHAR(50) NOT NULL,
    apellido_materno_persona NVARCHAR(50) NULL,
    telefono_persona VARCHAR(20) NULL,
    fecha_nacimiento_persona DATE NULL,

    CONSTRAINT PK_persona PRIMARY KEY (ID_persona),
    CONSTRAINT UQ_persona_rut UNIQUE (rut_persona),
    CONSTRAINT CK_persona_nombres
        CHECK (LEN(LTRIM(RTRIM(nombres_persona))) > 0),
    CONSTRAINT CK_persona_apellido
        CHECK (LEN(LTRIM(RTRIM(apellido_paterno_persona))) > 0)
);
GO

CREATE TABLE Usuario
(
    ID_usuario INT IDENTITY(1,1) NOT NULL,
    ID_persona_usuario INT NOT NULL,
    email_usuario VARCHAR(150) NOT NULL,
    password_hash_usuario VARCHAR(255) NOT NULL,
    activo_usuario BIT NOT NULL CONSTRAINT DF_usuario_activo DEFAULT 1,
    fecha_creacion_usuario DATETIME2(0) NOT NULL
        CONSTRAINT DF_usuario_fecha DEFAULT SYSDATETIME(),

    CONSTRAINT PK_usuario PRIMARY KEY (ID_usuario),
    CONSTRAINT FK_usuario_persona
        FOREIGN KEY (ID_persona_usuario) REFERENCES Persona(ID_persona),
    CONSTRAINT UQ_usuario_persona UNIQUE (ID_persona_usuario),
    CONSTRAINT UQ_usuario_email UNIQUE (email_usuario)
);
GO

CREATE TABLE Rol
(
    ID_rol INT IDENTITY(1,1) NOT NULL,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion_rol NVARCHAR(200) NULL,

    CONSTRAINT PK_rol PRIMARY KEY (ID_rol),
    CONSTRAINT UQ_rol_nombre UNIQUE (nombre_rol)
);
GO

CREATE TABLE UsuarioRol
(
    ID_usuario_usuario_rol INT NOT NULL,
    ID_rol_usuario_rol INT NOT NULL,
    fecha_asignacion_usuario_rol DATETIME2(0) NOT NULL
        CONSTRAINT DF_usuario_rol_fecha DEFAULT SYSDATETIME(),

    CONSTRAINT PK_usuario_rol
        PRIMARY KEY (ID_usuario_usuario_rol, ID_rol_usuario_rol),
    CONSTRAINT FK_usuario_rol_usuario
        FOREIGN KEY (ID_usuario_usuario_rol) REFERENCES Usuario(ID_usuario),
    CONSTRAINT FK_usuario_rol_rol
        FOREIGN KEY (ID_rol_usuario_rol) REFERENCES Rol(ID_rol)
);
GO

CREATE TABLE Cliente
(
    ID_usuario_cliente INT NOT NULL,
    fecha_alta_cliente DATETIME2(0) NOT NULL
        CONSTRAINT DF_cliente_fecha DEFAULT SYSDATETIME(),
    activo_cliente BIT NOT NULL CONSTRAINT DF_cliente_activo DEFAULT 1,

    CONSTRAINT PK_cliente PRIMARY KEY (ID_usuario_cliente),
    CONSTRAINT FK_cliente_usuario
        FOREIGN KEY (ID_usuario_cliente) REFERENCES Usuario(ID_usuario)
);
GO

/* ================================================================
   3. PROVEEDORES
   ================================================================ */

CREATE TABLE TipoProveedor
(
    ID_tipo_proveedor INT IDENTITY(1,1) NOT NULL,
    nombre_tipo_proveedor VARCHAR(50) NOT NULL,

    CONSTRAINT PK_tipo_proveedor PRIMARY KEY (ID_tipo_proveedor),
    CONSTRAINT UQ_tipo_proveedor_nombre UNIQUE (nombre_tipo_proveedor)
);
GO

CREATE TABLE EstadoProveedor
(
    ID_estado_proveedor INT IDENTITY(1,1) NOT NULL,
    nombre_estado_proveedor VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_proveedor PRIMARY KEY (ID_estado_proveedor),
    CONSTRAINT UQ_estado_proveedor_nombre
        UNIQUE (nombre_estado_proveedor)
);
GO

CREATE TABLE Proveedor
(
    ID_proveedor INT IDENTITY(1,1) NOT NULL,
    ID_tipo_proveedor_proveedor INT NOT NULL,
    ID_persona_proveedor INT NULL,
    ID_estado_proveedor_proveedor INT NOT NULL,
    razon_social_proveedor NVARCHAR(150) NULL,
    nombre_comercial_proveedor NVARCHAR(150) NOT NULL,
    rut_proveedor VARCHAR(12) NULL,
    telefono_proveedor VARCHAR(20) NULL,
    email_proveedor VARCHAR(150) NULL,
    fecha_registro_proveedor DATETIME2(0) NOT NULL
        CONSTRAINT DF_proveedor_fecha DEFAULT SYSDATETIME(),

    CONSTRAINT PK_proveedor PRIMARY KEY (ID_proveedor),
    CONSTRAINT FK_proveedor_tipo
        FOREIGN KEY (ID_tipo_proveedor_proveedor)
        REFERENCES TipoProveedor(ID_tipo_proveedor),
    CONSTRAINT FK_proveedor_persona
        FOREIGN KEY (ID_persona_proveedor)
        REFERENCES Persona(ID_persona),
    CONSTRAINT FK_proveedor_estado
        FOREIGN KEY (ID_estado_proveedor_proveedor)
        REFERENCES EstadoProveedor(ID_estado_proveedor),
    CONSTRAINT CK_proveedor_nombre
        CHECK (LEN(LTRIM(RTRIM(nombre_comercial_proveedor))) > 0)
);
GO

CREATE UNIQUE INDEX UX_proveedor_rut
ON Proveedor(rut_proveedor)
WHERE rut_proveedor IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_proveedor_persona
ON Proveedor(ID_persona_proveedor)
WHERE ID_persona_proveedor IS NOT NULL;
GO

CREATE TABLE ProveedorUsuario
(
    ID_proveedor_proveedor_usuario INT NOT NULL,
    ID_usuario_proveedor_usuario INT NOT NULL,
    fecha_vinculacion_proveedor_usuario DATETIME2(0) NOT NULL
        CONSTRAINT DF_proveedor_usuario_fecha DEFAULT SYSDATETIME(),
    es_administrador_proveedor_usuario BIT NOT NULL
        CONSTRAINT DF_proveedor_usuario_admin DEFAULT 0,

    CONSTRAINT PK_proveedor_usuario
        PRIMARY KEY (ID_proveedor_proveedor_usuario,
                     ID_usuario_proveedor_usuario),
    CONSTRAINT FK_proveedor_usuario_proveedor
        FOREIGN KEY (ID_proveedor_proveedor_usuario)
        REFERENCES Proveedor(ID_proveedor),
    CONSTRAINT FK_proveedor_usuario_usuario
        FOREIGN KEY (ID_usuario_proveedor_usuario)
        REFERENCES Usuario(ID_usuario)
);
GO

CREATE TABLE ConfiguracionProveedor
(
    ID_proveedor_configuracion_proveedor INT NOT NULL,
    permite_devolucion_otra_sede BIT NOT NULL
        CONSTRAINT DF_configuracion_otra_sede DEFAULT 0,
    permite_entrega_domicilio BIT NOT NULL
        CONSTRAINT DF_configuracion_entrega DEFAULT 0,
    permite_retiro_domicilio BIT NOT NULL
        CONSTRAINT DF_configuracion_retiro DEFAULT 0,
    radio_maximo_km DECIMAL(8,2) NULL,

    CONSTRAINT PK_configuracion_proveedor
        PRIMARY KEY (ID_proveedor_configuracion_proveedor),
    CONSTRAINT FK_configuracion_proveedor
        FOREIGN KEY (ID_proveedor_configuracion_proveedor)
        REFERENCES Proveedor(ID_proveedor),
    CONSTRAINT CK_configuracion_radio
        CHECK (radio_maximo_km IS NULL OR radio_maximo_km > 0)
);
GO

CREATE TABLE SedeProveedor
(
    ID_sede_proveedor INT IDENTITY(1,1) NOT NULL,
    ID_proveedor_sede_proveedor INT NOT NULL,
    ID_comuna_sede_proveedor INT NOT NULL,
    nombre_sede_proveedor NVARCHAR(100) NOT NULL,
    direccion_sede_proveedor NVARCHAR(200) NOT NULL,
    telefono_sede_proveedor VARCHAR(20) NULL,
    email_sede_proveedor VARCHAR(150) NULL,
    activo_sede_proveedor BIT NOT NULL
        CONSTRAINT DF_sede_activa DEFAULT 1,

    CONSTRAINT PK_sede_proveedor PRIMARY KEY (ID_sede_proveedor),
    CONSTRAINT FK_sede_proveedor_proveedor
        FOREIGN KEY (ID_proveedor_sede_proveedor)
        REFERENCES Proveedor(ID_proveedor),
    CONSTRAINT FK_sede_proveedor_comuna
        FOREIGN KEY (ID_comuna_sede_proveedor)
        REFERENCES Comuna(ID_comuna),
    CONSTRAINT UQ_sede_proveedor_nombre
        UNIQUE (ID_proveedor_sede_proveedor, nombre_sede_proveedor),
    CONSTRAINT UQ_sede_proveedor_proveedor_sede
        UNIQUE (ID_proveedor_sede_proveedor, ID_sede_proveedor)
);
GO

/* ================================================================
   4. CATALOGOS DE VEHICULOS
   ================================================================ */

CREATE TABLE TipoVehiculo
(
    ID_tipo_vehiculo INT IDENTITY(1,1) NOT NULL,
    nombre_tipo_vehiculo VARCHAR(50) NOT NULL,
    activo_tipo_vehiculo BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_tipo_vehiculo PRIMARY KEY (ID_tipo_vehiculo),
    CONSTRAINT UQ_tipo_vehiculo_nombre UNIQUE (nombre_tipo_vehiculo)
);
GO

CREATE TABLE Marca
(
    ID_marca INT IDENTITY(1,1) NOT NULL,
    nombre_marca VARCHAR(80) NOT NULL,
    activo_marca BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_marca PRIMARY KEY (ID_marca),
    CONSTRAINT UQ_marca_nombre UNIQUE (nombre_marca)
);
GO

CREATE TABLE Modelo
(
    ID_modelo INT IDENTITY(1,1) NOT NULL,
    ID_marca_modelo INT NOT NULL,
    nombre_modelo VARCHAR(100) NOT NULL,
    activo_modelo BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_modelo PRIMARY KEY (ID_modelo),
    CONSTRAINT FK_modelo_marca
        FOREIGN KEY (ID_marca_modelo) REFERENCES Marca(ID_marca),
    CONSTRAINT UQ_modelo_marca_nombre
        UNIQUE (ID_marca_modelo, nombre_modelo)
);
GO

CREATE TABLE TipoCombustible
(
    ID_tipo_combustible INT IDENTITY(1,1) NOT NULL,
    nombre_tipo_combustible VARCHAR(50) NOT NULL,
    activo_tipo_combustible BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_tipo_combustible PRIMARY KEY (ID_tipo_combustible),
    CONSTRAINT UQ_tipo_combustible_nombre
        UNIQUE (nombre_tipo_combustible)
);
GO

CREATE TABLE TipoTransmision
(
    ID_tipo_transmision INT IDENTITY(1,1) NOT NULL,
    nombre_tipo_transmision VARCHAR(50) NOT NULL,
    activo_tipo_transmision BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_tipo_transmision PRIMARY KEY (ID_tipo_transmision),
    CONSTRAINT UQ_tipo_transmision_nombre
        UNIQUE (nombre_tipo_transmision)
);
GO

CREATE TABLE EstadoVehiculo
(
    ID_estado_vehiculo INT IDENTITY(1,1) NOT NULL,
    nombre_estado_vehiculo VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_vehiculo PRIMARY KEY (ID_estado_vehiculo),
    CONSTRAINT UQ_estado_vehiculo_nombre
        UNIQUE (nombre_estado_vehiculo)
);
GO

CREATE TABLE EstadoPublicacionVehiculo
(
    ID_estado_publicacion_vehiculo INT IDENTITY(1,1) NOT NULL,
    nombre_estado_publicacion_vehiculo VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_publicacion_vehiculo
        PRIMARY KEY (ID_estado_publicacion_vehiculo),
    CONSTRAINT UQ_estado_publicacion_nombre
        UNIQUE (nombre_estado_publicacion_vehiculo)
);
GO

/* ================================================================
   5. VEHICULOS Y DISPONIBILIDAD
   ================================================================ */

CREATE TABLE Vehiculo
(
    ID_vehiculo INT IDENTITY(1,1) NOT NULL,
    ID_proveedor_vehiculo INT NOT NULL,
    ID_sede_actual_vehiculo INT NULL,
    ID_modelo_vehiculo INT NOT NULL,
    ID_tipo_vehiculo_vehiculo INT NOT NULL,
    ID_tipo_combustible_vehiculo INT NOT NULL,
    ID_tipo_transmision_vehiculo INT NOT NULL,
    ID_estado_vehiculo_vehiculo INT NOT NULL,
    ID_estado_publicacion_vehiculo_vehiculo INT NOT NULL,
    patente_vehiculo VARCHAR(10) NOT NULL,
    vin_vehiculo VARCHAR(17) NOT NULL,
    anio_vehiculo SMALLINT NOT NULL,
    kilometraje_vehiculo INT NOT NULL,
    precio_diario_base_vehiculo DECIMAL(12,2) NOT NULL,
    fecha_registro_vehiculo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_vehiculo PRIMARY KEY (ID_vehiculo),
    CONSTRAINT FK_vehiculo_proveedor
        FOREIGN KEY (ID_proveedor_vehiculo)
        REFERENCES Proveedor(ID_proveedor),
    CONSTRAINT FK_vehiculo_sede_actual
        FOREIGN KEY (ID_sede_actual_vehiculo)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_vehiculo_modelo
        FOREIGN KEY (ID_modelo_vehiculo) REFERENCES Modelo(ID_modelo),
    CONSTRAINT FK_vehiculo_tipo
        FOREIGN KEY (ID_tipo_vehiculo_vehiculo)
        REFERENCES TipoVehiculo(ID_tipo_vehiculo),
    CONSTRAINT FK_vehiculo_combustible
        FOREIGN KEY (ID_tipo_combustible_vehiculo)
        REFERENCES TipoCombustible(ID_tipo_combustible),
    CONSTRAINT FK_vehiculo_transmision
        FOREIGN KEY (ID_tipo_transmision_vehiculo)
        REFERENCES TipoTransmision(ID_tipo_transmision),
    CONSTRAINT FK_vehiculo_estado
        FOREIGN KEY (ID_estado_vehiculo_vehiculo)
        REFERENCES EstadoVehiculo(ID_estado_vehiculo),
    CONSTRAINT FK_vehiculo_publicacion
        FOREIGN KEY (ID_estado_publicacion_vehiculo_vehiculo)
        REFERENCES EstadoPublicacionVehiculo(ID_estado_publicacion_vehiculo),
    CONSTRAINT UQ_vehiculo_patente UNIQUE (patente_vehiculo),
    CONSTRAINT UQ_vehiculo_vin UNIQUE (vin_vehiculo),
    CONSTRAINT CK_vehiculo_anio CHECK (anio_vehiculo BETWEEN 1950 AND 2100),
    CONSTRAINT CK_vehiculo_kilometraje CHECK (kilometraje_vehiculo >= 0),
    CONSTRAINT CK_vehiculo_precio CHECK (precio_diario_base_vehiculo > 0)
);
GO

CREATE TABLE VehiculoSede
(
    ID_vehiculo_vehiculo_sede INT NOT NULL,
    ID_sede_proveedor_vehiculo_sede INT NOT NULL,
    disponible_para_entrega BIT NOT NULL DEFAULT 1,
    disponible_para_devolucion BIT NOT NULL DEFAULT 1,
    fecha_inicio_vehiculo_sede DATE NULL,
    fecha_fin_vehiculo_sede DATE NULL,

    CONSTRAINT PK_vehiculo_sede
        PRIMARY KEY (ID_vehiculo_vehiculo_sede,
                     ID_sede_proveedor_vehiculo_sede),
    CONSTRAINT FK_vehiculo_sede_vehiculo
        FOREIGN KEY (ID_vehiculo_vehiculo_sede)
        REFERENCES Vehiculo(ID_vehiculo),
    CONSTRAINT FK_vehiculo_sede_sede
        FOREIGN KEY (ID_sede_proveedor_vehiculo_sede)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT CK_vehiculo_sede_fechas
        CHECK (
            fecha_fin_vehiculo_sede IS NULL
            OR fecha_inicio_vehiculo_sede IS NULL
            OR fecha_fin_vehiculo_sede >= fecha_inicio_vehiculo_sede
        )
);
GO

CREATE TABLE VehiculoComuna
(
    ID_vehiculo_vehiculo_comuna INT NOT NULL,
    ID_comuna_vehiculo_comuna INT NOT NULL,

    CONSTRAINT PK_vehiculo_comuna
        PRIMARY KEY (ID_vehiculo_vehiculo_comuna,
                     ID_comuna_vehiculo_comuna),
    CONSTRAINT FK_vehiculo_comuna_vehiculo
        FOREIGN KEY (ID_vehiculo_vehiculo_comuna)
        REFERENCES Vehiculo(ID_vehiculo),
    CONSTRAINT FK_vehiculo_comuna_comuna
        FOREIGN KEY (ID_comuna_vehiculo_comuna)
        REFERENCES Comuna(ID_comuna)
);
GO

CREATE TABLE MovimientoVehiculo
(
    ID_movimiento_vehiculo INT IDENTITY(1,1) NOT NULL,
    ID_vehiculo_movimiento_vehiculo INT NOT NULL,
    ID_sede_origen_movimiento_vehiculo INT NULL,
    ID_sede_destino_movimiento_vehiculo INT NULL,
    fecha_movimiento_vehiculo DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    observacion_movimiento_vehiculo NVARCHAR(300) NULL,

    CONSTRAINT PK_movimiento_vehiculo
        PRIMARY KEY (ID_movimiento_vehiculo),
    CONSTRAINT FK_movimiento_vehiculo_vehiculo
        FOREIGN KEY (ID_vehiculo_movimiento_vehiculo)
        REFERENCES Vehiculo(ID_vehiculo),
    CONSTRAINT FK_movimiento_vehiculo_origen
        FOREIGN KEY (ID_sede_origen_movimiento_vehiculo)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_movimiento_vehiculo_destino
        FOREIGN KEY (ID_sede_destino_movimiento_vehiculo)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT CK_movimiento_sedes
        CHECK (
            ID_sede_origen_movimiento_vehiculo IS NULL
            OR ID_sede_destino_movimiento_vehiculo IS NULL
            OR ID_sede_origen_movimiento_vehiculo
               <> ID_sede_destino_movimiento_vehiculo
        )
);
GO

/* ================================================================
   6. RESERVAS, ARRIENDOS Y PAGOS
   ================================================================ */

CREATE TABLE EstadoReserva
(
    ID_estado_reserva INT IDENTITY(1,1) NOT NULL,
    nombre_estado_reserva VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_reserva PRIMARY KEY (ID_estado_reserva),
    CONSTRAINT UQ_estado_reserva_nombre
        UNIQUE (nombre_estado_reserva)
);
GO

CREATE TABLE Reserva
(
    ID_reserva INT IDENTITY(1,1) NOT NULL,
    ID_usuario_cliente_reserva INT NOT NULL,
    ID_vehiculo_reserva INT NOT NULL,
    ID_sede_retiro_reserva INT NOT NULL,
    ID_sede_devolucion_reserva INT NOT NULL,
    ID_estado_reserva_reserva INT NOT NULL,
    fecha_inicio_reserva DATE NOT NULL,
    fecha_fin_reserva DATE NOT NULL,
    precio_diario_aplicado_reserva DECIMAL(12,2) NOT NULL,
    fecha_reserva DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    observaciones_reserva NVARCHAR(500) NULL,

    CONSTRAINT PK_reserva PRIMARY KEY (ID_reserva),
    CONSTRAINT FK_reserva_cliente
        FOREIGN KEY (ID_usuario_cliente_reserva)
        REFERENCES Cliente(ID_usuario_cliente),
    CONSTRAINT FK_reserva_vehiculo
        FOREIGN KEY (ID_vehiculo_reserva)
        REFERENCES Vehiculo(ID_vehiculo),
    CONSTRAINT FK_reserva_sede_retiro
        FOREIGN KEY (ID_sede_retiro_reserva)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_reserva_sede_devolucion
        FOREIGN KEY (ID_sede_devolucion_reserva)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_reserva_estado
        FOREIGN KEY (ID_estado_reserva_reserva)
        REFERENCES EstadoReserva(ID_estado_reserva),
    CONSTRAINT CK_reserva_fechas
        CHECK (fecha_fin_reserva > fecha_inicio_reserva),
    CONSTRAINT CK_reserva_precio
        CHECK (precio_diario_aplicado_reserva > 0)
);
GO

CREATE TABLE EstadoArriendo
(
    ID_estado_arriendo INT IDENTITY(1,1) NOT NULL,
    nombre_estado_arriendo VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_arriendo PRIMARY KEY (ID_estado_arriendo),
    CONSTRAINT UQ_estado_arriendo_nombre
        UNIQUE (nombre_estado_arriendo)
);
GO

CREATE TABLE Arriendo
(
    ID_arriendo INT IDENTITY(1,1) NOT NULL,
    ID_reserva_arriendo INT NOT NULL,
    ID_sede_retiro_real_arriendo INT NOT NULL,
    ID_sede_devolucion_real_arriendo INT NULL,
    ID_estado_arriendo_arriendo INT NOT NULL,
    fecha_hora_retiro_real_arriendo DATETIME2(0) NOT NULL,
    fecha_hora_devolucion_real_arriendo DATETIME2(0) NULL,
    kilometraje_inicial_arriendo INT NOT NULL,
    kilometraje_final_arriendo INT NULL,
    combustible_inicial_arriendo DECIMAL(5,2) NOT NULL,
    combustible_final_arriendo DECIMAL(5,2) NULL,

    CONSTRAINT PK_arriendo PRIMARY KEY (ID_arriendo),
    CONSTRAINT UQ_arriendo_reserva UNIQUE (ID_reserva_arriendo),
    CONSTRAINT FK_arriendo_reserva
        FOREIGN KEY (ID_reserva_arriendo)
        REFERENCES Reserva(ID_reserva),
    CONSTRAINT FK_arriendo_sede_retiro
        FOREIGN KEY (ID_sede_retiro_real_arriendo)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_arriendo_sede_devolucion
        FOREIGN KEY (ID_sede_devolucion_real_arriendo)
        REFERENCES SedeProveedor(ID_sede_proveedor),
    CONSTRAINT FK_arriendo_estado
        FOREIGN KEY (ID_estado_arriendo_arriendo)
        REFERENCES EstadoArriendo(ID_estado_arriendo),
    CONSTRAINT CK_arriendo_km_inicial
        CHECK (kilometraje_inicial_arriendo >= 0),
    CONSTRAINT CK_arriendo_km_final
        CHECK (
            kilometraje_final_arriendo IS NULL
            OR kilometraje_final_arriendo >= kilometraje_inicial_arriendo
        ),
    CONSTRAINT CK_arriendo_combustible_inicial
        CHECK (combustible_inicial_arriendo BETWEEN 0 AND 100),
    CONSTRAINT CK_arriendo_combustible_final
        CHECK (
            combustible_final_arriendo IS NULL
            OR combustible_final_arriendo BETWEEN 0 AND 100
        ),
    CONSTRAINT CK_arriendo_fechas
        CHECK (
            fecha_hora_devolucion_real_arriendo IS NULL
            OR fecha_hora_devolucion_real_arriendo
               >= fecha_hora_retiro_real_arriendo
        )
);
GO

CREATE TABLE MetodoPago
(
    ID_metodo_pago INT IDENTITY(1,1) NOT NULL,
    nombre_metodo_pago VARCHAR(50) NOT NULL,
    activo_metodo_pago BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_metodo_pago PRIMARY KEY (ID_metodo_pago),
    CONSTRAINT UQ_metodo_pago_nombre UNIQUE (nombre_metodo_pago)
);
GO

CREATE TABLE EstadoPago
(
    ID_estado_pago INT IDENTITY(1,1) NOT NULL,
    nombre_estado_pago VARCHAR(50) NOT NULL,

    CONSTRAINT PK_estado_pago PRIMARY KEY (ID_estado_pago),
    CONSTRAINT UQ_estado_pago_nombre UNIQUE (nombre_estado_pago)
);
GO

CREATE TABLE Pago
(
    ID_pago INT IDENTITY(1,1) NOT NULL,
    ID_reserva_pago INT NOT NULL,
    ID_metodo_pago_pago INT NOT NULL,
    ID_estado_pago_pago INT NOT NULL,
    monto_pago DECIMAL(12,2) NOT NULL,
    moneda_pago CHAR(3) NOT NULL DEFAULT 'CLP',
    referencia_proveedor_pago VARCHAR(100) NULL,
    fecha_pago DATETIME2(0) NULL,

    CONSTRAINT PK_pago PRIMARY KEY (ID_pago),
    CONSTRAINT FK_pago_reserva
        FOREIGN KEY (ID_reserva_pago) REFERENCES Reserva(ID_reserva),
    CONSTRAINT FK_pago_metodo
        FOREIGN KEY (ID_metodo_pago_pago) REFERENCES MetodoPago(ID_metodo_pago),
    CONSTRAINT FK_pago_estado
        FOREIGN KEY (ID_estado_pago_pago) REFERENCES EstadoPago(ID_estado_pago),
    CONSTRAINT CK_pago_monto CHECK (monto_pago > 0),
    CONSTRAINT CK_pago_moneda CHECK (moneda_pago = 'CLP')
);
GO

CREATE TABLE Resena
(
    ID_resena INT IDENTITY(1,1) NOT NULL,
    ID_arriendo_resena INT NOT NULL,
    calificacion_resena TINYINT NOT NULL,
    comentario_resena NVARCHAR(1000) NULL,
    fecha_resena DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    activo_resena BIT NOT NULL DEFAULT 1,

    CONSTRAINT PK_resena PRIMARY KEY (ID_resena),
    CONSTRAINT UQ_resena_arriendo UNIQUE (ID_arriendo_resena),
    CONSTRAINT FK_resena_arriendo
        FOREIGN KEY (ID_arriendo_resena) REFERENCES Arriendo(ID_arriendo),
    CONSTRAINT CK_resena_calificacion
        CHECK (calificacion_resena BETWEEN 1 AND 5)
);
GO

/* ================================================================
   7. AUDITORIA
   ================================================================ */

CREATE TABLE Auditoria
(
    ID_auditoria BIGINT IDENTITY(1,1) NOT NULL,
    ID_usuario_auditoria INT NULL,
    tabla_afectada_auditoria VARCHAR(100) NOT NULL,
    ID_registro_auditoria INT NULL,
    accion_auditoria VARCHAR(50) NOT NULL,
    valor_anterior_auditoria NVARCHAR(200) NULL,
    valor_nuevo_auditoria NVARCHAR(200) NULL,
    fecha_hora_auditoria DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    descripcion_auditoria NVARCHAR(1000) NULL,

    CONSTRAINT PK_auditoria PRIMARY KEY (ID_auditoria),
    CONSTRAINT FK_auditoria_usuario
        FOREIGN KEY (ID_usuario_auditoria) REFERENCES Usuario(ID_usuario),
    CONSTRAINT CK_auditoria_tabla
        CHECK (LEN(LTRIM(RTRIM(tabla_afectada_auditoria))) > 0),
    CONSTRAINT CK_auditoria_accion
        CHECK (LEN(LTRIM(RTRIM(accion_auditoria))) > 0)
);
GO

/* ================================================================
   8. INDICES
   ================================================================ */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE INDEX IX_comuna_region
ON Comuna(ID_region_comuna);

CREATE INDEX IX_proveedor_estado
ON Proveedor(ID_estado_proveedor_proveedor);

CREATE INDEX IX_sede_proveedor
ON SedeProveedor(ID_proveedor_sede_proveedor);

CREATE INDEX IX_vehiculo_proveedor
ON Vehiculo(ID_proveedor_vehiculo);

CREATE INDEX IX_vehiculo_estado_publicacion
ON Vehiculo(ID_estado_publicacion_vehiculo_vehiculo);

CREATE INDEX IX_vehiculo_estado_operativo
ON Vehiculo(ID_estado_vehiculo_vehiculo);

CREATE INDEX IX_reserva_vehiculo_fechas
ON Reserva(ID_vehiculo_reserva, fecha_inicio_reserva, fecha_fin_reserva);

CREATE INDEX IX_reserva_cliente
ON Reserva(ID_usuario_cliente_reserva, fecha_inicio_reserva);

CREATE INDEX IX_pago_reserva_estado
ON Pago(ID_reserva_pago, ID_estado_pago_pago);

CREATE INDEX IX_auditoria_fecha
ON Auditoria(fecha_hora_auditoria);
GO

/* ================================================================
   9. DATOS INICIALES
   ================================================================ */

INSERT INTO Rol(nombre_rol, descripcion_rol)
VALUES
('ADMIN', 'Administrador general de la plataforma'),
('OPERADOR', 'Usuario operativo de un proveedor'),
('CLIENTE', 'Usuario que realiza reservas y arriendos'),
('PROVEEDOR', 'Usuario que administra vehiculos publicados');

INSERT INTO TipoProveedor(nombre_tipo_proveedor)
VALUES ('PERSONA'), ('EMPRESA');

INSERT INTO EstadoProveedor(nombre_estado_proveedor)
VALUES ('PENDIENTE'), ('APROBADO'), ('RECHAZADO'), ('SUSPENDIDO'), ('INACTIVO');

INSERT INTO TipoVehiculo(nombre_tipo_vehiculo)
VALUES ('SEDAN'), ('SUV'), ('HATCHBACK'), ('PICKUP'), ('VAN'), ('COUPE');

INSERT INTO TipoCombustible(nombre_tipo_combustible)
VALUES ('GASOLINA'), ('DIESEL'), ('HIBRIDO'), ('ELECTRICO');

INSERT INTO TipoTransmision(nombre_tipo_transmision)
VALUES ('MANUAL'), ('AUTOMATICA');

INSERT INTO EstadoVehiculo(nombre_estado_vehiculo)
VALUES ('DISPONIBLE'), ('EN_MANTENIMIENTO'), ('ARRENDADO'), ('FUERA_DE_SERVICIO');

INSERT INTO EstadoPublicacionVehiculo(nombre_estado_publicacion_vehiculo)
VALUES ('PENDIENTE'), ('PUBLICADO'), ('RECHAZADO'), ('SUSPENDIDO');

INSERT INTO EstadoReserva(nombre_estado_reserva)
VALUES ('PENDIENTE'), ('CONFIRMADA'), ('CANCELADA'), ('COMPLETADA'), ('EXPIRADA');

INSERT INTO EstadoArriendo(nombre_estado_arriendo)
VALUES ('ACTIVO'), ('FINALIZADO'), ('CANCELADO');

INSERT INTO MetodoPago(nombre_metodo_pago)
VALUES ('TARJETA'), ('TRANSFERENCIA'), ('WEBPAY');

INSERT INTO EstadoPago(nombre_estado_pago)
VALUES ('PENDIENTE'), ('APROBADO'), ('RECHAZADO'), ('REEMBOLSADO');

INSERT INTO Region(nombre_region)
VALUES ('Region Metropolitana');

INSERT INTO Comuna(ID_region_comuna, nombre_comuna)
SELECT ID_region, 'Santiago'
FROM Region
WHERE nombre_region = 'Region Metropolitana';

INSERT INTO Marca(nombre_marca)
VALUES ('Toyota'), ('Hyundai'), ('Kia');

INSERT INTO Modelo(ID_marca_modelo, nombre_modelo)
SELECT ID_marca, 'Corolla'
FROM Marca
WHERE nombre_marca = 'Toyota';

INSERT INTO Modelo(ID_marca_modelo, nombre_modelo)
SELECT ID_marca, 'Tucson'
FROM Marca
WHERE nombre_marca = 'Hyundai';

INSERT INTO Modelo(ID_marca_modelo, nombre_modelo)
SELECT ID_marca, 'Rio'
FROM Marca
WHERE nombre_marca = 'Kia';
GO

/* ================================================================
   10. VISTAS
   ================================================================ */

CREATE VIEW vw_VehiculosPublicados
AS
SELECT
    v.ID_vehiculo,
    v.patente_vehiculo,
    v.anio_vehiculo,
    v.kilometraje_vehiculo,
    v.precio_diario_base_vehiculo,
    p.ID_proveedor,
    p.nombre_comercial_proveedor,
    tp.nombre_tipo_proveedor,
    m.nombre_marca,
    mo.nombre_modelo,
    tv.nombre_tipo_vehiculo,
    ev.nombre_estado_vehiculo,
    ep.nombre_estado_publicacion_vehiculo,
    s.ID_sede_proveedor,
    s.nombre_sede_proveedor,
    c.nombre_comuna,
    r.nombre_region
FROM Vehiculo v
INNER JOIN Proveedor p
    ON p.ID_proveedor = v.ID_proveedor_vehiculo
INNER JOIN TipoProveedor tp
    ON tp.ID_tipo_proveedor = p.ID_tipo_proveedor_proveedor
INNER JOIN Modelo mo
    ON mo.ID_modelo = v.ID_modelo_vehiculo
INNER JOIN Marca m
    ON m.ID_marca = mo.ID_marca_modelo
INNER JOIN TipoVehiculo tv
    ON tv.ID_tipo_vehiculo = v.ID_tipo_vehiculo_vehiculo
INNER JOIN EstadoVehiculo ev
    ON ev.ID_estado_vehiculo = v.ID_estado_vehiculo_vehiculo
INNER JOIN EstadoPublicacionVehiculo ep
    ON ep.ID_estado_publicacion_vehiculo =
       v.ID_estado_publicacion_vehiculo_vehiculo
LEFT JOIN SedeProveedor s
    ON s.ID_sede_proveedor = v.ID_sede_actual_vehiculo
LEFT JOIN Comuna c
    ON c.ID_comuna = s.ID_comuna_sede_proveedor
LEFT JOIN Region r
    ON r.ID_region = c.ID_region_comuna
WHERE p.ID_estado_proveedor_proveedor =
      (SELECT ID_estado_proveedor FROM EstadoProveedor
       WHERE nombre_estado_proveedor = 'APROBADO')
  AND ep.nombre_estado_publicacion_vehiculo = 'PUBLICADO';
GO

CREATE VIEW vw_ReservasDetalle
AS
SELECT
    re.ID_reserva,
    re.fecha_inicio_reserva,
    re.fecha_fin_reserva,
    re.precio_diario_aplicado_reserva,
    CONCAT(pe.nombres_persona, ' ', pe.apellido_paterno_persona)
        AS nombre_cliente,
    u.email_usuario,
    v.ID_vehiculo,
    v.patente_vehiculo,
    mo.nombre_modelo,
    ma.nombre_marca,
    pr.ID_proveedor,
    pr.nombre_comercial_proveedor,
    sr.nombre_sede_proveedor AS sede_retiro,
    sd.nombre_sede_proveedor AS sede_devolucion,
    er.nombre_estado_reserva,
    ep.nombre_estado_pago,
    pg.monto_pago,
    pg.fecha_pago
FROM Reserva re
INNER JOIN Cliente cl
    ON cl.ID_usuario_cliente = re.ID_usuario_cliente_reserva
INNER JOIN Usuario u
    ON u.ID_usuario = cl.ID_usuario_cliente
INNER JOIN Persona pe
    ON pe.ID_persona = u.ID_persona_usuario
INNER JOIN Vehiculo v
    ON v.ID_vehiculo = re.ID_vehiculo_reserva
INNER JOIN Modelo mo
    ON mo.ID_modelo = v.ID_modelo_vehiculo
INNER JOIN Marca ma
    ON ma.ID_marca = mo.ID_marca_modelo
INNER JOIN Proveedor pr
    ON pr.ID_proveedor = v.ID_proveedor_vehiculo
INNER JOIN SedeProveedor sr
    ON sr.ID_sede_proveedor = re.ID_sede_retiro_reserva
INNER JOIN SedeProveedor sd
    ON sd.ID_sede_proveedor = re.ID_sede_devolucion_reserva
INNER JOIN EstadoReserva er
    ON er.ID_estado_reserva = re.ID_estado_reserva_reserva
LEFT JOIN Pago pg
    ON pg.ID_reserva_pago = re.ID_reserva
LEFT JOIN EstadoPago ep
    ON ep.ID_estado_pago = pg.ID_estado_pago_pago;
GO

/* ================================================================
   11. TRIGGERS DE AUDITORIA
   ================================================================ */

CREATE TRIGGER trg_auditoria_reserva_estado
ON Reserva
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(ID_estado_reserva_reserva)
    BEGIN
        INSERT INTO Auditoria
        (
            tabla_afectada_auditoria,
            ID_registro_auditoria,
            accion_auditoria,
            valor_anterior_auditoria,
            valor_nuevo_auditoria,
            descripcion_auditoria
        )
        SELECT
            'Reserva',
            i.ID_reserva,
            'CAMBIO_ESTADO',
            ea.nombre_estado_reserva,
            en.nombre_estado_reserva,
            'Cambio automatico de estado de reserva'
        FROM inserted i
        INNER JOIN deleted d
            ON d.ID_reserva = i.ID_reserva
        INNER JOIN EstadoReserva ea
            ON ea.ID_estado_reserva = d.ID_estado_reserva_reserva
        INNER JOIN EstadoReserva en
            ON en.ID_estado_reserva = i.ID_estado_reserva_reserva
        WHERE d.ID_estado_reserva_reserva
              <> i.ID_estado_reserva_reserva;
    END;
END;
GO

CREATE TRIGGER trg_auditoria_proveedor_estado
ON Proveedor
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(ID_estado_proveedor_proveedor)
    BEGIN
        INSERT INTO Auditoria
        (
            tabla_afectada_auditoria,
            ID_registro_auditoria,
            accion_auditoria,
            valor_anterior_auditoria,
            valor_nuevo_auditoria,
            descripcion_auditoria
        )
        SELECT
            'Proveedor',
            i.ID_proveedor,
            'CAMBIO_ESTADO',
            ea.nombre_estado_proveedor,
            en.nombre_estado_proveedor,
            'Cambio de estado del proveedor'
        FROM inserted i
        INNER JOIN deleted d
            ON d.ID_proveedor = i.ID_proveedor
        INNER JOIN EstadoProveedor ea
            ON ea.ID_estado_proveedor = d.ID_estado_proveedor_proveedor
        INNER JOIN EstadoProveedor en
            ON en.ID_estado_proveedor = i.ID_estado_proveedor_proveedor
        WHERE d.ID_estado_proveedor_proveedor
              <> i.ID_estado_proveedor_proveedor;
    END;
END;
GO

CREATE TRIGGER trg_validar_tipo_proveedor
ON Proveedor
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted i
        INNER JOIN TipoProveedor tp
            ON tp.ID_tipo_proveedor = i.ID_tipo_proveedor_proveedor
        WHERE (
            tp.nombre_tipo_proveedor = 'PERSONA'
            AND i.ID_persona_proveedor IS NULL
        )
        OR (
            tp.nombre_tipo_proveedor = 'EMPRESA'
            AND (
                i.ID_persona_proveedor IS NOT NULL
                OR i.razon_social_proveedor IS NULL
                OR i.rut_proveedor IS NULL
            )
        )
    )
        THROW 54001, 'Los datos no coinciden con el tipo de proveedor.', 1;
END;
GO

CREATE TRIGGER trg_validar_vehiculo_sede_actual
ON Vehiculo
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted i
        INNER JOIN SedeProveedor s
            ON s.ID_sede_proveedor = i.ID_sede_actual_vehiculo
        WHERE i.ID_sede_actual_vehiculo IS NOT NULL
          AND s.ID_proveedor_sede_proveedor <> i.ID_proveedor_vehiculo
    )
        THROW 54002, 'La sede actual no pertenece al proveedor del vehiculo.', 1;
END;
GO

CREATE TRIGGER trg_validar_vehiculo_sede
ON VehiculoSede
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted i
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = i.ID_vehiculo_vehiculo_sede
        INNER JOIN SedeProveedor s
            ON s.ID_sede_proveedor = i.ID_sede_proveedor_vehiculo_sede
        WHERE v.ID_proveedor_vehiculo <> s.ID_proveedor_sede_proveedor
    )
        THROW 54003, 'La sede habilitada no pertenece al proveedor del vehiculo.', 1;
END;
GO

CREATE TRIGGER trg_validar_reserva_sedes
ON Reserva
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted i
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = i.ID_vehiculo_reserva
        INNER JOIN SedeProveedor sr
            ON sr.ID_sede_proveedor = i.ID_sede_retiro_reserva
        INNER JOIN SedeProveedor sd
            ON sd.ID_sede_proveedor = i.ID_sede_devolucion_reserva
        WHERE v.ID_proveedor_vehiculo <> sr.ID_proveedor_sede_proveedor
           OR v.ID_proveedor_vehiculo <> sd.ID_proveedor_sede_proveedor
    )
        THROW 54004, 'Las sedes de la reserva no pertenecen al proveedor.', 1;
END;
GO

CREATE TRIGGER trg_validar_arriendo_sedes
ON Arriendo
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS
    (
        SELECT 1
        FROM inserted i
        INNER JOIN Reserva r
            ON r.ID_reserva = i.ID_reserva_arriendo
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = r.ID_vehiculo_reserva
        INNER JOIN SedeProveedor sr
            ON sr.ID_sede_proveedor = i.ID_sede_retiro_real_arriendo
        LEFT JOIN SedeProveedor sd
            ON sd.ID_sede_proveedor = i.ID_sede_devolucion_real_arriendo
        WHERE v.ID_proveedor_vehiculo <> sr.ID_proveedor_sede_proveedor
           OR (
                sd.ID_sede_proveedor IS NOT NULL
                AND v.ID_proveedor_vehiculo <> sd.ID_proveedor_sede_proveedor
           )
    )
        THROW 54005, 'Las sedes del arriendo no pertenecen al proveedor.', 1;
END;
GO

/* ================================================================
   12. PROCEDIMIENTO: REGISTRAR PROVEEDOR
   ================================================================ */

CREATE PROCEDURE sp_RegistrarProveedor
    @ID_tipo_proveedor INT,
    @ID_persona_proveedor INT = NULL,
    @nombre_comercial NVARCHAR(150),
    @razon_social NVARCHAR(150) = NULL,
    @rut_proveedor VARCHAR(12) = NULL,
    @telefono VARCHAR(20) = NULL,
    @email VARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @tipo VARCHAR(50);
    DECLARE @estado INT;
    DECLARE @ID_proveedor INT;

    SELECT @tipo = nombre_tipo_proveedor
    FROM TipoProveedor
    WHERE ID_tipo_proveedor = @ID_tipo_proveedor;

    IF @tipo IS NULL
        THROW 51001, 'El tipo de proveedor no existe.', 1;

    IF @tipo = 'PERSONA' AND @ID_persona_proveedor IS NULL
        THROW 51002, 'Un proveedor persona requiere una persona asociada.', 1;

    IF @tipo = 'EMPRESA'
       AND (@razon_social IS NULL OR @rut_proveedor IS NULL)
        THROW 51003, 'Una empresa requiere razon social y RUT.', 1;

    SELECT @estado = ID_estado_proveedor
    FROM EstadoProveedor
    WHERE nombre_estado_proveedor = 'PENDIENTE';

    INSERT INTO Proveedor
    (
        ID_tipo_proveedor_proveedor,
        ID_persona_proveedor,
        ID_estado_proveedor_proveedor,
        razon_social_proveedor,
        nombre_comercial_proveedor,
        rut_proveedor,
        telefono_proveedor,
        email_proveedor
    )
    VALUES
    (
        @ID_tipo_proveedor,
        @ID_persona_proveedor,
        @estado,
        @razon_social,
        @nombre_comercial,
        @rut_proveedor,
        @telefono,
        @email
    );

    SET @ID_proveedor = CONVERT(INT, SCOPE_IDENTITY());

    SELECT *
    FROM Proveedor
    WHERE ID_proveedor = @ID_proveedor;
END;
GO

/* ================================================================
   13. PROCEDIMIENTO: CREAR RESERVA
   ================================================================ */

CREATE PROCEDURE sp_CrearReserva
    @ID_usuario_cliente INT,
    @ID_vehiculo INT,
    @ID_sede_retiro INT,
    @ID_sede_devolucion INT,
    @fecha_inicio DATE,
    @fecha_fin DATE,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ID_proveedor INT;
    DECLARE @precio DECIMAL(12,2);
    DECLARE @estado_reserva INT;
    DECLARE @ID_reserva INT;
    DECLARE @estado_publicacion VARCHAR(50);
    DECLARE @estado_proveedor VARCHAR(50);

    BEGIN TRY
        SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
        BEGIN TRANSACTION;

        IF @fecha_fin <= @fecha_inicio
            THROW 51004, 'La fecha de devolucion debe ser posterior al retiro.', 1;

        IF @fecha_inicio < CAST(GETDATE() AS DATE)
            THROW 51005, 'La fecha de inicio no puede ser anterior a hoy.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM Cliente
            WHERE ID_usuario_cliente = @ID_usuario_cliente
              AND activo_cliente = 1
        )
            THROW 51006, 'El cliente no existe o esta inactivo.', 1;

        SELECT
            @ID_proveedor = v.ID_proveedor_vehiculo,
            @precio = v.precio_diario_base_vehiculo,
            @estado_publicacion = ep.nombre_estado_publicacion_vehiculo,
            @estado_proveedor = es.nombre_estado_proveedor
        FROM Vehiculo v
        INNER JOIN EstadoPublicacionVehiculo ep
            ON ep.ID_estado_publicacion_vehiculo =
               v.ID_estado_publicacion_vehiculo_vehiculo
        INNER JOIN Proveedor p
            ON p.ID_proveedor = v.ID_proveedor_vehiculo
        INNER JOIN EstadoProveedor es
            ON es.ID_estado_proveedor = p.ID_estado_proveedor_proveedor
        WHERE v.ID_vehiculo = @ID_vehiculo
          AND v.ID_estado_vehiculo_vehiculo =
              (SELECT ID_estado_vehiculo
               FROM EstadoVehiculo
               WHERE nombre_estado_vehiculo = 'DISPONIBLE');

        IF @ID_proveedor IS NULL
            THROW 51007, 'El vehiculo no existe o no esta disponible.', 1;

        IF @estado_publicacion <> 'PUBLICADO'
            THROW 51008, 'El vehiculo no esta publicado.', 1;

        IF @estado_proveedor <> 'APROBADO'
            THROW 51009, 'El proveedor no esta aprobado.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM SedeProveedor
            WHERE ID_sede_proveedor IN
                  (@ID_sede_retiro, @ID_sede_devolucion)
              AND ID_proveedor_sede_proveedor <> @ID_proveedor
        )
            THROW 51010, 'Las sedes no pertenecen al proveedor del vehiculo.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM VehiculoSede vs
            WHERE vs.ID_vehiculo_vehiculo_sede = @ID_vehiculo
              AND vs.ID_sede_proveedor_vehiculo_sede = @ID_sede_retiro
              AND vs.disponible_para_entrega = 1
        )
            THROW 51011, 'La sede de retiro no esta habilitada.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM VehiculoSede vs
            WHERE vs.ID_vehiculo_vehiculo_sede = @ID_vehiculo
              AND vs.ID_sede_proveedor_vehiculo_sede = @ID_sede_devolucion
              AND vs.disponible_para_devolucion = 1
        )
            THROW 51012, 'La sede de devolucion no esta habilitada.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM Reserva r WITH (UPDLOCK, HOLDLOCK)
            INNER JOIN EstadoReserva er
                ON er.ID_estado_reserva = r.ID_estado_reserva_reserva
            WHERE r.ID_vehiculo_reserva = @ID_vehiculo
              AND er.nombre_estado_reserva IN ('PENDIENTE', 'CONFIRMADA')
              AND @fecha_inicio < r.fecha_fin_reserva
              AND @fecha_fin > r.fecha_inicio_reserva
        )
            THROW 51013, 'El vehiculo ya esta reservado en esas fechas.', 1;

        SELECT @estado_reserva = ID_estado_reserva
        FROM EstadoReserva
        WHERE nombre_estado_reserva = 'PENDIENTE';

        INSERT INTO Reserva
        (
            ID_usuario_cliente_reserva,
            ID_vehiculo_reserva,
            ID_sede_retiro_reserva,
            ID_sede_devolucion_reserva,
            ID_estado_reserva_reserva,
            fecha_inicio_reserva,
            fecha_fin_reserva,
            precio_diario_aplicado_reserva,
            observaciones_reserva
        )
        VALUES
        (
            @ID_usuario_cliente,
            @ID_vehiculo,
            @ID_sede_retiro,
            @ID_sede_devolucion,
            @estado_reserva,
            @fecha_inicio,
            @fecha_fin,
            @precio,
            @observaciones
        );

        SET @ID_reserva = CONVERT(INT, SCOPE_IDENTITY());

        COMMIT TRANSACTION;

        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

        SELECT *
        FROM vw_ReservasDetalle
        WHERE ID_reserva = @ID_reserva;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
        THROW;
    END CATCH;
END;
GO

/* ================================================================
   14. PROCEDIMIENTO: REGISTRAR PAGO
   ================================================================ */

CREATE PROCEDURE sp_RegistrarPago
    @ID_reserva INT,
    @ID_metodo_pago INT,
    @monto_pago DECIMAL(12,2),
    @aprobado BIT,
    @referencia VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @estado_pago INT;
    DECLARE @estado_reserva INT;
    DECLARE @nombre_estado_reserva VARCHAR(50);
    DECLARE @ID_pago INT;
    DECLARE @monto_esperado DECIMAL(12,2);

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS
        (
            SELECT 1
            FROM Reserva
            WHERE ID_reserva = @ID_reserva
        )
            THROW 52001, 'La reserva no existe.', 1;

        SELECT @nombre_estado_reserva = er.nombre_estado_reserva
        FROM Reserva r WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN EstadoReserva er
            ON er.ID_estado_reserva = r.ID_estado_reserva_reserva
        WHERE r.ID_reserva = @ID_reserva;

        IF @nombre_estado_reserva <> 'PENDIENTE'
            THROW 52002, 'La reserva no esta pendiente de pago.', 1;

        SELECT @monto_esperado =
            CONVERT(DECIMAL(12,2),
                DATEDIFF(DAY, fecha_inicio_reserva, fecha_fin_reserva)
                * precio_diario_aplicado_reserva)
        FROM Reserva
        WHERE ID_reserva = @ID_reserva;

        IF @monto_pago <> @monto_esperado
            THROW 52003, 'El monto del pago no coincide con la reserva.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM Pago p
            INNER JOIN EstadoPago ep
                ON ep.ID_estado_pago = p.ID_estado_pago_pago
            WHERE p.ID_reserva_pago = @ID_reserva
              AND ep.nombre_estado_pago = 'APROBADO'
        )
            THROW 52004, 'La reserva ya tiene un pago aprobado.', 1;

        SELECT @estado_pago = ID_estado_pago
        FROM EstadoPago
        WHERE nombre_estado_pago =
            CASE WHEN @aprobado = 1 THEN 'APROBADO' ELSE 'RECHAZADO' END;

        INSERT INTO Pago
        (
            ID_reserva_pago,
            ID_metodo_pago_pago,
            ID_estado_pago_pago,
            monto_pago,
            referencia_proveedor_pago,
            fecha_pago
        )
        VALUES
        (
            @ID_reserva,
            @ID_metodo_pago,
            @estado_pago,
            @monto_pago,
            @referencia,
            CASE WHEN @aprobado = 1 THEN SYSDATETIME() ELSE NULL END
        );

        SET @ID_pago = CONVERT(INT, SCOPE_IDENTITY());

        IF @aprobado = 1
        BEGIN
            SELECT @estado_reserva = ID_estado_reserva
            FROM EstadoReserva
            WHERE nombre_estado_reserva = 'CONFIRMADA';

            UPDATE Reserva
            SET ID_estado_reserva_reserva = @estado_reserva
            WHERE ID_reserva = @ID_reserva;
        END;

        COMMIT TRANSACTION;

        SELECT *
        FROM Pago
        WHERE ID_pago = @ID_pago;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* ================================================================
   15. PROCEDIMIENTO: APROBAR PROVEEDOR
   ================================================================ */

CREATE PROCEDURE sp_AprobarProveedor
    @ID_proveedor INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @estado INT;

    SELECT @estado = ID_estado_proveedor
    FROM EstadoProveedor
    WHERE nombre_estado_proveedor = 'APROBADO';

    IF NOT EXISTS
    (
        SELECT 1
        FROM Proveedor
        WHERE ID_proveedor = @ID_proveedor
    )
        THROW 53001, 'El proveedor no existe.', 1;

    UPDATE Proveedor
    SET ID_estado_proveedor_proveedor = @estado
    WHERE ID_proveedor = @ID_proveedor;
END;
GO

/* ================================================================
   16. PROCEDIMIENTO: PUBLICAR VEHICULO
   ================================================================ */

CREATE PROCEDURE sp_PublicarVehiculo
    @ID_vehiculo INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @estado_publicado INT;

    IF NOT EXISTS
    (
        SELECT 1
        FROM Vehiculo v
        INNER JOIN Proveedor p
            ON p.ID_proveedor = v.ID_proveedor_vehiculo
        INNER JOIN EstadoProveedor ep
            ON ep.ID_estado_proveedor = p.ID_estado_proveedor_proveedor
        WHERE v.ID_vehiculo = @ID_vehiculo
          AND ep.nombre_estado_proveedor = 'APROBADO'
    )
        THROW 53002, 'El proveedor del vehiculo no esta aprobado.', 1;

    SELECT @estado_publicado = ID_estado_publicacion_vehiculo
    FROM EstadoPublicacionVehiculo
    WHERE nombre_estado_publicacion_vehiculo = 'PUBLICADO';

    UPDATE Vehiculo
    SET ID_estado_publicacion_vehiculo_vehiculo = @estado_publicado
    WHERE ID_vehiculo = @ID_vehiculo;
END;
GO

/* ================================================================
   17. PROCEDIMIENTO: INICIAR ARRIENDO
   ================================================================ */

CREATE PROCEDURE sp_IniciarArriendo
    @ID_reserva INT,
    @ID_sede_retiro_real INT,
    @kilometraje_inicial INT,
    @combustible_inicial DECIMAL(5,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ID_vehiculo INT;
    DECLARE @ID_proveedor INT;
    DECLARE @estado_reserva VARCHAR(50);
    DECLARE @estado_arriendo INT;
    DECLARE @estado_vehiculo INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT
            @ID_vehiculo = r.ID_vehiculo_reserva,
            @ID_proveedor = v.ID_proveedor_vehiculo,
            @estado_reserva = er.nombre_estado_reserva
        FROM Reserva r WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = r.ID_vehiculo_reserva
        INNER JOIN EstadoReserva er
            ON er.ID_estado_reserva = r.ID_estado_reserva_reserva
        WHERE r.ID_reserva = @ID_reserva;

        IF @ID_vehiculo IS NULL
            THROW 53003, 'La reserva no existe.', 1;

        IF @estado_reserva <> 'CONFIRMADA'
            THROW 53004, 'La reserva no esta confirmada.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM SedeProveedor
            WHERE ID_sede_proveedor = @ID_sede_retiro_real
              AND ID_proveedor_sede_proveedor = @ID_proveedor
              AND activo_sede_proveedor = 1
        )
            THROW 53005, 'La sede no pertenece al proveedor.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM Arriendo
            WHERE ID_reserva_arriendo = @ID_reserva
        )
            THROW 53006, 'La reserva ya tiene un arriendo.', 1;

        SELECT @estado_arriendo = ID_estado_arriendo
        FROM EstadoArriendo
        WHERE nombre_estado_arriendo = 'ACTIVO';

        SELECT @estado_vehiculo = ID_estado_vehiculo
        FROM EstadoVehiculo
        WHERE nombre_estado_vehiculo = 'ARRENDADO';

        INSERT INTO Arriendo
        (
            ID_reserva_arriendo,
            ID_sede_retiro_real_arriendo,
            ID_estado_arriendo_arriendo,
            fecha_hora_retiro_real_arriendo,
            kilometraje_inicial_arriendo,
            combustible_inicial_arriendo
        )
        VALUES
        (
            @ID_reserva,
            @ID_sede_retiro_real,
            @estado_arriendo,
            SYSDATETIME(),
            @kilometraje_inicial,
            @combustible_inicial
        );

        UPDATE Vehiculo
        SET ID_estado_vehiculo_vehiculo = @estado_vehiculo
        WHERE ID_vehiculo = @ID_vehiculo;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* ================================================================
   18. PROCEDIMIENTO: REGISTRAR DEVOLUCION
   ================================================================ */

CREATE PROCEDURE sp_RegistrarDevolucion
    @ID_arriendo INT,
    @ID_sede_devolucion_real INT,
    @kilometraje_final INT,
    @combustible_final DECIMAL(5,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ID_reserva INT;
    DECLARE @ID_vehiculo INT;
    DECLARE @ID_proveedor INT;
    DECLARE @estado_arriendo VARCHAR(50);
    DECLARE @estado_finalizado INT;
    DECLARE @estado_disponible INT;
    DECLARE @estado_reserva_completada INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT
            @ID_reserva = a.ID_reserva_arriendo,
            @ID_vehiculo = r.ID_vehiculo_reserva,
            @ID_proveedor = v.ID_proveedor_vehiculo,
            @estado_arriendo = ea.nombre_estado_arriendo
        FROM Arriendo a WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Reserva r
            ON r.ID_reserva = a.ID_reserva_arriendo
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = r.ID_vehiculo_reserva
        INNER JOIN EstadoArriendo ea
            ON ea.ID_estado_arriendo = a.ID_estado_arriendo_arriendo
        WHERE a.ID_arriendo = @ID_arriendo;

        IF @ID_reserva IS NULL
            THROW 53007, 'El arriendo no existe.', 1;

        IF @estado_arriendo <> 'ACTIVO'
            THROW 53008, 'El arriendo no esta activo.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM SedeProveedor
            WHERE ID_sede_proveedor = @ID_sede_devolucion_real
              AND ID_proveedor_sede_proveedor = @ID_proveedor
              AND activo_sede_proveedor = 1
        )
            THROW 53009, 'La sede de devolucion no pertenece al proveedor.', 1;

        SELECT @estado_finalizado = ID_estado_arriendo
        FROM EstadoArriendo
        WHERE nombre_estado_arriendo = 'FINALIZADO';

        SELECT @estado_disponible = ID_estado_vehiculo
        FROM EstadoVehiculo
        WHERE nombre_estado_vehiculo = 'DISPONIBLE';

        SELECT @estado_reserva_completada = ID_estado_reserva
        FROM EstadoReserva
        WHERE nombre_estado_reserva = 'COMPLETADA';

        UPDATE Arriendo
        SET ID_sede_devolucion_real_arriendo = @ID_sede_devolucion_real,
            ID_estado_arriendo_arriendo = @estado_finalizado,
            fecha_hora_devolucion_real_arriendo = SYSDATETIME(),
            kilometraje_final_arriendo = @kilometraje_final,
            combustible_final_arriendo = @combustible_final
        WHERE ID_arriendo = @ID_arriendo;

        UPDATE Vehiculo
        SET ID_estado_vehiculo_vehiculo = @estado_disponible,
            ID_sede_actual_vehiculo = @ID_sede_devolucion_real
        WHERE ID_vehiculo = @ID_vehiculo;

        UPDATE Reserva
        SET ID_estado_reserva_reserva = @estado_reserva_completada
        WHERE ID_reserva = @ID_reserva;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* ================================================================
   19. PROCEDIMIENTO: CREAR RESEÑA
   ================================================================ */

CREATE PROCEDURE sp_CrearResena
    @ID_usuario_cliente INT,
    @ID_arriendo INT,
    @calificacion TINYINT,
    @comentario NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM Arriendo a
        INNER JOIN Reserva r
            ON r.ID_reserva = a.ID_reserva_arriendo
        INNER JOIN EstadoArriendo ea
            ON ea.ID_estado_arriendo = a.ID_estado_arriendo_arriendo
        WHERE a.ID_arriendo = @ID_arriendo
          AND r.ID_usuario_cliente_reserva = @ID_usuario_cliente
          AND ea.nombre_estado_arriendo = 'FINALIZADO'
    )
        THROW 53010, 'El usuario no puede reseñar este arriendo.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM Resena
        WHERE ID_arriendo_resena = @ID_arriendo
    )
        THROW 53011, 'El arriendo ya tiene una reseña.', 1;

    INSERT INTO Resena
    (
        ID_arriendo_resena,
        calificacion_resena,
        comentario_resena
    )
    VALUES
    (
        @ID_arriendo,
        @calificacion,
        @comentario
    );
END;
GO

/* ================================================================
   20. PROCEDIMIENTO: REPORTE DE PROVEEDORES CON CURSOR
   ================================================================ */

CREATE OR ALTER PROCEDURE sp_CancelarReserva
    @ID_reserva INT,
    @ID_usuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ownerId INT;
    DECLARE @stateName VARCHAR(50);
    DECLARE @cancelledState INT;
    DECLARE @refusedPaymentState INT;
    DECLARE @refundedPaymentState INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT
            @ownerId = r.ID_usuario_cliente_reserva,
            @stateName = er.nombre_estado_reserva
        FROM Reserva r WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN EstadoReserva er
            ON er.ID_estado_reserva = r.ID_estado_reserva_reserva
        WHERE r.ID_reserva = @ID_reserva;

        IF @ownerId IS NULL
            THROW 55001, 'La reserva no existe.', 1;

        IF @ownerId <> @ID_usuario
            THROW 55002, 'El usuario no puede cancelar esta reserva.', 1;

        IF @stateName NOT IN ('PENDIENTE', 'CONFIRMADA')
            THROW 55003, 'La reserva no puede ser cancelada.', 1;

        SELECT @cancelledState = ID_estado_reserva
        FROM EstadoReserva
        WHERE nombre_estado_reserva = 'CANCELADA';

        SELECT @refusedPaymentState = ID_estado_pago
        FROM EstadoPago
        WHERE nombre_estado_pago = 'RECHAZADO';

        SELECT @refundedPaymentState = ID_estado_pago
        FROM EstadoPago
        WHERE nombre_estado_pago = 'REEMBOLSADO';

        UPDATE Reserva
        SET ID_estado_reserva_reserva = @cancelledState
        WHERE ID_reserva = @ID_reserva;

        UPDATE p
        SET ID_estado_pago_pago =
            CASE
                WHEN ep.nombre_estado_pago = 'APROBADO'
                    THEN @refundedPaymentState
                ELSE @refusedPaymentState
            END
        FROM Pago p
        INNER JOIN EstadoPago ep
            ON ep.ID_estado_pago = p.ID_estado_pago_pago
        WHERE p.ID_reserva_pago = @ID_reserva
          AND ep.nombre_estado_pago IN ('PENDIENTE', 'APROBADO');

        COMMIT TRANSACTION;

        SELECT *
        FROM vw_ReservasDetalle
        WHERE ID_reserva = @ID_reserva;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE PROCEDURE sp_ReporteProveedores
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ID_proveedor INT;
    DECLARE @nombre VARCHAR(150);
    DECLARE @cantidad_vehiculos INT;
    DECLARE @cantidad_publicados INT;
    DECLARE @cantidad_reservas INT;
    DECLARE @total_pagado DECIMAL(12,2);

    DECLARE @reporte TABLE
    (
        ID_proveedor INT,
        nombre_proveedor NVARCHAR(150),
        cantidad_vehiculos INT,
        cantidad_publicados INT,
        cantidad_reservas INT,
        total_pagado DECIMAL(12,2)
    );

    DECLARE cursor_proveedores CURSOR LOCAL FAST_FORWARD FOR
        SELECT ID_proveedor, nombre_comercial_proveedor
        FROM Proveedor
        ORDER BY nombre_comercial_proveedor;

    OPEN cursor_proveedores;

    FETCH NEXT FROM cursor_proveedores
    INTO @ID_proveedor, @nombre;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @cantidad_vehiculos = COUNT(*)
        FROM Vehiculo
        WHERE ID_proveedor_vehiculo = @ID_proveedor;

        SELECT @cantidad_publicados = COUNT(*)
        FROM Vehiculo v
        INNER JOIN EstadoPublicacionVehiculo ep
            ON ep.ID_estado_publicacion_vehiculo =
               v.ID_estado_publicacion_vehiculo_vehiculo
        WHERE v.ID_proveedor_vehiculo = @ID_proveedor
          AND ep.nombre_estado_publicacion_vehiculo = 'PUBLICADO';

        SELECT @cantidad_reservas = COUNT(*)
        FROM Reserva r
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = r.ID_vehiculo_reserva
        WHERE v.ID_proveedor_vehiculo = @ID_proveedor;

        SELECT @total_pagado = COALESCE(SUM(p.monto_pago), 0)
        FROM Pago p
        INNER JOIN Reserva r
            ON r.ID_reserva = p.ID_reserva_pago
        INNER JOIN Vehiculo v
            ON v.ID_vehiculo = r.ID_vehiculo_reserva
        INNER JOIN EstadoPago ep
            ON ep.ID_estado_pago = p.ID_estado_pago_pago
        WHERE v.ID_proveedor_vehiculo = @ID_proveedor
          AND ep.nombre_estado_pago = 'APROBADO';

        INSERT INTO @reporte
        VALUES
        (
            @ID_proveedor,
            @nombre,
            @cantidad_vehiculos,
            @cantidad_publicados,
            @cantidad_reservas,
            @total_pagado
        );

        FETCH NEXT FROM cursor_proveedores
        INTO @ID_proveedor, @nombre;
    END;

    CLOSE cursor_proveedores;
    DEALLOCATE cursor_proveedores;

    SELECT *
    FROM @reporte
    ORDER BY nombre_proveedor;
END;
GO

/* ================================================================
   16. REPORTE DE CANTIDAD DE EMPRESAS Y PERSONAS
   ================================================================ */

CREATE PROCEDURE sp_ReporteTiposProveedor
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        tp.nombre_tipo_proveedor,
        COUNT(p.ID_proveedor) AS cantidad_proveedores
    FROM TipoProveedor tp
    LEFT JOIN Proveedor p
        ON p.ID_tipo_proveedor_proveedor = tp.ID_tipo_proveedor
    GROUP BY
        tp.ID_tipo_proveedor,
        tp.nombre_tipo_proveedor
    ORDER BY tp.nombre_tipo_proveedor;
END;
GO

/* ================================================================
   17. CONSULTAS DE PRUEBA
   ================================================================ */

-- Consultar proveedores por tipo:
-- EXEC sp_ReporteTiposProveedor;

-- Reporte general utilizando cursor:
-- EXEC sp_ReporteProveedores;

-- Vehiculos publicados:
-- SELECT * FROM vw_VehiculosPublicados;

-- Detalle de reservas:
-- SELECT * FROM vw_ReservasDetalle;
GO
