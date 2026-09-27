-- *******************************************************************
-- ALTER incremental: galeria de fotos de vehiculos (subida de proveedores)
-- Aplicar sobre una base ya creada con RentaCarDB.sql
-- *******************************************************************

-- 1) Tabla de fotos (1-N por vehiculo). Solo guarda URLs; el binario
--    vive en Backend/uploads/vehiculos y se sirve por /uploads.
IF OBJECT_ID('dbo.VehiculoFoto', 'U') IS NULL
BEGIN
    CREATE TABLE VehiculoFoto
    (
        ID_foto_vehiculo          INT IDENTITY(1,1) NOT NULL,
        ID_vehiculo_vehiculo_foto INT NOT NULL,
        url_foto_vehiculo         VARCHAR(500) NOT NULL,
        es_principal_foto         BIT NOT NULL CONSTRAINT DF_VehiculoFoto_es_principal DEFAULT 0,
        activo_foto_vehiculo      BIT NOT NULL CONSTRAINT DF_VehiculoFoto_activo DEFAULT 1,
        fecha_subida_foto         DATETIME2 NOT NULL CONSTRAINT DF_VehiculoFoto_fecha DEFAULT SYSDATETIME(),
        CONSTRAINT PK_VehiculoFoto PRIMARY KEY (ID_foto_vehiculo),
        CONSTRAINT FK_VehiculoFoto_Vehiculo
            FOREIGN KEY (ID_vehiculo_vehiculo_foto) REFERENCES Vehiculo(ID_vehiculo)
    );

    CREATE INDEX IX_VehiculoFoto_Vehiculo
        ON VehiculoFoto(ID_vehiculo_vehiculo_foto);
END
GO

-- 2) Vista publica: expone la foto principal para el listado/detalle
CREATE OR ALTER VIEW vw_VehiculosPublicados
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
    r.nombre_region,
    (
        SELECT TOP 1 f.url_foto_vehiculo
        FROM VehiculoFoto f
        WHERE f.ID_vehiculo_vehiculo_foto = v.ID_vehiculo
          AND f.es_principal_foto = 1
          AND f.activo_foto_vehiculo = 1
    ) AS url_foto_principal
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