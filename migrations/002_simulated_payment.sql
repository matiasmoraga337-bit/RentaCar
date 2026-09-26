IF OBJECT_ID('PagoTransaccionSimulada', 'U') IS NULL
BEGIN
    CREATE TABLE PagoTransaccionSimulada
    (
        ID_transaccion_simulada BIGINT IDENTITY(1,1) NOT NULL,
        ID_reserva_transaccion_simulada INT NOT NULL,
        buy_order_transaccion_simulada VARCHAR(100) NOT NULL,
        session_id_transaccion_simulada VARCHAR(100) NOT NULL,
        token_ws_transaccion_simulada CHAR(64) NOT NULL,
        monto_transaccion_simulada DECIMAL(12,2) NOT NULL,
        estado_transaccion_simulada VARCHAR(20) NOT NULL DEFAULT 'CREADA',
        fecha_creacion_transaccion_simulada DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        fecha_respuesta_transaccion_simulada DATETIME2(0) NULL,

        CONSTRAINT PK_pago_transaccion_simulada PRIMARY KEY (ID_transaccion_simulada),
        CONSTRAINT UQ_pago_transaccion_buy_order UNIQUE (buy_order_transaccion_simulada),
        CONSTRAINT UQ_pago_transaccion_session UNIQUE (session_id_transaccion_simulada),
        CONSTRAINT UQ_pago_transaccion_token UNIQUE (token_ws_transaccion_simulada),
        CONSTRAINT FK_pago_transaccion_reserva
            FOREIGN KEY (ID_reserva_transaccion_simulada) REFERENCES Reserva(ID_reserva),
        CONSTRAINT CK_pago_transaccion_estado
            CHECK (estado_transaccion_simulada IN ('CREADA', 'APROBADA', 'RECHAZADA', 'ABORTADA')),
        CONSTRAINT CK_pago_transaccion_monto CHECK (monto_transaccion_simulada > 0)
    );
END;
GO
