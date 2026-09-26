IF OBJECT_ID('Sesion', 'U') IS NULL
BEGIN
    CREATE TABLE Sesion
    (
        ID_sesion BIGINT IDENTITY(1,1) NOT NULL,
        ID_usuario_sesion INT NOT NULL,
        refresh_token_hash_sesion CHAR(64) NOT NULL,
        fecha_expiracion_sesion DATETIME2(0) NOT NULL,
        fecha_revocacion_sesion DATETIME2(0) NULL,
        ultimo_uso_sesion DATETIME2(0) NULL,
        user_agent_sesion NVARCHAR(255) NULL,
        ip_origen_sesion VARCHAR(45) NULL,
        fecha_creacion_sesion DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_sesion PRIMARY KEY (ID_sesion),
        CONSTRAINT UQ_sesion_refresh_token UNIQUE (refresh_token_hash_sesion),
        CONSTRAINT FK_sesion_usuario
            FOREIGN KEY (ID_usuario_sesion) REFERENCES Usuario(ID_usuario)
    );

    CREATE INDEX IX_sesion_usuario ON Sesion(ID_usuario_sesion);
END;
GO