IF COL_LENGTH('Usuario', 'email_confirmado_usuario') IS NULL
BEGIN
    ALTER TABLE Usuario
    ADD email_confirmado_usuario BIT NOT NULL
        CONSTRAINT DF_usuario_email_confirmado DEFAULT 0;
END;
GO

IF OBJECT_ID('EmailVerificacion', 'U') IS NULL
BEGIN
    CREATE TABLE EmailVerificacion
    (
        ID_email_verificacion BIGINT IDENTITY(1,1) NOT NULL,
        ID_usuario_email_verificacion INT NOT NULL,
        token_hash_email_verificacion CHAR(64) NOT NULL,
        fecha_expiracion_email_verificacion DATETIME2(0) NOT NULL,
        fecha_uso_email_verificacion DATETIME2(0) NULL,
        fecha_creacion_email_verificacion DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_email_verificacion PRIMARY KEY (ID_email_verificacion),
        CONSTRAINT UQ_email_verificacion_token UNIQUE (token_hash_email_verificacion),
        CONSTRAINT FK_email_verificacion_usuario
            FOREIGN KEY (ID_usuario_email_verificacion) REFERENCES Usuario(ID_usuario)
    );
END;
GO

UPDATE Usuario
SET email_confirmado_usuario = 1
WHERE email_confirmado_usuario = 0;
GO
