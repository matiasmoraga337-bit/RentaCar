CREATE OR ALTER TRIGGER trg_auditoria_reserva_estado
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
            ID_usuario_auditoria,
            valor_anterior_auditoria,
            valor_nuevo_auditoria,
            descripcion_auditoria
        )
        SELECT
            'Reserva', i.ID_reserva, 'CAMBIO_ESTADO',
            TRY_CONVERT(INT, SESSION_CONTEXT(N'usuario_id')),
            ea.nombre_estado_reserva, en.nombre_estado_reserva,
            'Cambio automatico de estado de reserva'
        FROM inserted i
        INNER JOIN deleted d ON d.ID_reserva = i.ID_reserva
        INNER JOIN EstadoReserva ea ON ea.ID_estado_reserva = d.ID_estado_reserva_reserva
        INNER JOIN EstadoReserva en ON en.ID_estado_reserva = i.ID_estado_reserva_reserva
        WHERE d.ID_estado_reserva_reserva <> i.ID_estado_reserva_reserva;
    END;
END;
GO

CREATE OR ALTER TRIGGER trg_auditoria_proveedor_estado
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
            ID_usuario_auditoria,
            valor_anterior_auditoria,
            valor_nuevo_auditoria,
            descripcion_auditoria
        )
        SELECT
            'Proveedor', i.ID_proveedor, 'CAMBIO_ESTADO',
            TRY_CONVERT(INT, SESSION_CONTEXT(N'usuario_id')),
            ea.nombre_estado_proveedor, en.nombre_estado_proveedor,
            'Cambio de estado del proveedor'
        FROM inserted i
        INNER JOIN deleted d ON d.ID_proveedor = i.ID_proveedor
        INNER JOIN EstadoProveedor ea ON ea.ID_estado_proveedor = d.ID_estado_proveedor_proveedor
        INNER JOIN EstadoProveedor en ON en.ID_estado_proveedor = i.ID_estado_proveedor_proveedor
        WHERE d.ID_estado_proveedor_proveedor <> i.ID_estado_proveedor_proveedor;
    END;
END;
GO
