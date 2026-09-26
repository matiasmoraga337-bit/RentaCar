IF OBJECT_ID('PasswordResetToken', 'U') IS NULL
BEGIN
    CREATE TABLE PasswordResetToken
    (
        ID_password_reset BIGINT IDENTITY(1,1) NOT NULL,
        ID_usuario_password_reset INT NOT NULL,
        token_hash_password_reset CHAR(64) NOT NULL,
        fecha_expiracion_password_reset DATETIME2(0) NOT NULL,
        fecha_uso_password_reset DATETIME2(0) NULL,
        fecha_creacion_password_reset DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),

        CONSTRAINT PK_password_reset PRIMARY KEY (ID_password_reset),
        CONSTRAINT UQ_password_reset_token UNIQUE (token_hash_password_reset),
        CONSTRAINT FK_password_reset_usuario
            FOREIGN KEY (ID_usuario_password_reset) REFERENCES Usuario(ID_usuario)
    );
END;
GO
