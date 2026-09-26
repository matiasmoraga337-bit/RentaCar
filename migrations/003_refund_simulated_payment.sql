IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_pago_transaccion_estado'
      AND parent_object_id = OBJECT_ID('PagoTransaccionSimulada')
)
BEGIN
    ALTER TABLE PagoTransaccionSimulada DROP CONSTRAINT CK_pago_transaccion_estado;
END;
GO

ALTER TABLE PagoTransaccionSimulada
ADD CONSTRAINT CK_pago_transaccion_estado
CHECK (estado_transaccion_simulada IN ('CREADA', 'APROBADA', 'RECHAZADA', 'ABORTADA', 'REEMBOLSADA'));
GO
