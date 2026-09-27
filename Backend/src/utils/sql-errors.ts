import { HttpError } from './http-error.js';

interface BusinessErrorMapping {
  status: number;
  message: string;
}

const businessErrors: Record<number, BusinessErrorMapping> = {
  51001: { status: 400, message: 'El tipo de proveedor no existe.' },
  51002: { status: 400, message: 'Un proveedor persona requiere una persona asociada.' },
  51003: { status: 400, message: 'Una empresa requiere razon social y RUT.' },
  51004: { status: 400, message: 'La fecha de devolucion debe ser posterior al retiro.' },
  51005: { status: 400, message: 'La fecha de inicio no puede ser anterior a hoy.' },
  51006: { status: 400, message: 'El cliente no existe o esta inactivo.' },
  51007: { status: 400, message: 'El vehiculo no existe o no esta disponible.' },
  51008: { status: 400, message: 'El vehiculo no esta publicado.' },
  51009: { status: 400, message: 'El proveedor no esta aprobado.' },
  51010: { status: 400, message: 'Las sedes no pertenecen al proveedor del vehiculo.' },
  51011: { status: 400, message: 'La sede de retiro no esta habilitada.' },
  51012: { status: 400, message: 'La sede de devolucion no esta habilitada.' },
  51013: { status: 409, message: 'El vehiculo ya esta reservado en esas fechas.' },
  51014: { status: 409, message: 'El proveedor no permite devolucion en otra sede.' },
  52001: { status: 404, message: 'La reserva no existe.' },
  52002: { status: 409, message: 'La reserva no esta pendiente de pago.' },
  52003: { status: 400, message: 'El monto del pago no coincide con la reserva.' },
  52004: { status: 409, message: 'La reserva ya tiene un pago aprobado.' },
  53001: { status: 404, message: 'El proveedor no existe.' },
  53002: { status: 400, message: 'El proveedor del vehiculo no esta aprobado.' },
  53003: { status: 404, message: 'La reserva no existe.' },
  53004: { status: 409, message: 'La reserva no esta confirmada.' },
  53005: { status: 400, message: 'La sede no pertenece al proveedor.' },
  53006: { status: 409, message: 'La reserva ya tiene un arriendo.' },
  53007: { status: 404, message: 'El arriendo no existe.' },
  53008: { status: 409, message: 'El arriendo no esta activo.' },
  53009: { status: 400, message: 'La sede de devolucion no pertenece al proveedor.' },
  53010: { status: 403, message: 'El usuario no puede reseñar este arriendo.' },
  53011: { status: 409, message: 'El arriendo ya tiene una reseña.' },
  54001: { status: 400, message: 'Los datos no coinciden con el tipo de proveedor.' },
  54002: { status: 400, message: 'La sede actual no pertenece al proveedor del vehiculo.' },
  54003: { status: 400, message: 'La sede habilitada no pertenece al proveedor del vehiculo.' },
  54004: { status: 400, message: 'Las sedes de la reserva no pertenecen al proveedor.' },
  54005: { status: 400, message: 'Las sedes del arriendo no pertenecen al proveedor.' },
  55001: { status: 404, message: 'La reserva no existe.' },
  55002: { status: 403, message: 'El usuario no puede cancelar esta reserva.' },
  55003: { status: 409, message: 'La reserva no puede ser cancelada.' },
};

export interface SqlBusinessError {
  number: number;
  message?: string;
}

export function getSqlErrorNumber(error: unknown): number | null {
  const candidate = (error as SqlBusinessError | null)?.number;
  return typeof candidate === 'number' && Number.isInteger(candidate) ? candidate : null;
}

export function mapSqlBusinessError(error: unknown): HttpError | null {
  const number = getSqlErrorNumber(error);
  const mapping = number !== null ? businessErrors[number] : undefined;
  return mapping ? new HttpError(mapping.status, mapping.message) : null;
}