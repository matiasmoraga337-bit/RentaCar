import { useEffect, useState } from 'react';

import { Message } from '../components/Message';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { StatusBadge } from '../components/StatusBadge';
import { apiRequest } from '../services/api';

interface SummaryResponse {
  totals: {
    total_usuarios: number;
    total_proveedores: number;
    total_vehiculos: number;
    total_reservas: number;
    ingresos_simulados: number;
  };
  proveedores: { concepto: string; cantidad: number }[];
  publicaciones: { concepto: string; cantidad: number }[];
  reservas: { concepto: string; cantidad: number }[];
}

interface AdminProvider {
  ID_proveedor: number;
  nombre_comercial_proveedor: string;
  razon_social_proveedor?: string | null;
  rut_proveedor?: string | null;
  telefono_proveedor?: string | null;
  email_proveedor?: string | null;
  fecha_registro_proveedor: string;
  nombre_tipo_proveedor: string;
  nombre_estado_proveedor: string;
  total_vehiculos: number;
  total_sedes: number;
}

interface AdminVehicle {
  ID_vehiculo: number;
  patente_vehiculo: string;
  vin_vehiculo: string;
  anio_vehiculo: number;
  kilometraje_vehiculo: number;
  precio_diario_base_vehiculo: number;
  fecha_registro_vehiculo: string;
  nombre_comercial_proveedor: string;
  nombre_marca: string;
  nombre_modelo: string;
  nombre_tipo_vehiculo: string;
  nombre_estado_vehiculo: string;
  nombre_estado_publicacion_vehiculo: string;
}

interface AdminReservation {
  ID_reserva: number;
  fecha_inicio_reserva: string;
  fecha_fin_reserva: string;
  precio_diario_aplicado_reserva: number;
  nombre_cliente: string;
  email_usuario: string;
  patente_vehiculo: string;
  nombre_marca: string;
  nombre_modelo: string;
  nombre_comercial_proveedor: string;
  sede_retiro: string;
  sede_devolucion: string;
  nombre_estado_reserva: string;
  nombre_estado_pago: string | null;
  monto_pago: number | null;
}

interface AdminReview {
  ID_resena: number;
  calificacion_resena: number;
  comentario_resena: string | null;
  fecha_resena: string;
  activo_resena: boolean;
  ID_vehiculo: number;
  patente_vehiculo: string;
  nombre_modelo: string;
  nombre_marca: string;
  nombre_comercial_proveedor: string;
  nombre_cliente: string;
}

interface ProviderReport {
  ID_proveedor: number;
  nombre_proveedor: string;
  cantidad_vehiculos: number;
  cantidad_publicados: number;
  cantidad_reservas: number;
  total_pagado: number;
}

interface ProviderTypeReport {
  nombre_tipo_proveedor: string;
  cantidad_proveedores: number;
}

interface AuditEntry {
  ID_auditoria: number;
  tabla_afectada_auditoria: string;
  ID_registro_auditoria: number | null;
  accion_auditoria: string;
  valor_anterior_auditoria: string | null;
  valor_nuevo_auditoria: string | null;
  fecha_hora_auditoria: string;
  descripcion_auditoria: string | null;
  nombre_usuario: string;
  email_usuario: string | null;
}

interface AdminUser {
  ID_usuario: number;
  email_usuario: string;
  activo_usuario: boolean;
  email_confirmado_usuario: boolean;
  nombres_persona: string;
  apellido_paterno_persona: string;
  roles: string | null;
}

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="button button-outline button-small" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
      <span className="pagination-info">Página {page} de {totalPages}</span>
      <button className="button button-outline button-small" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Siguiente</button>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [report, setReport] = useState<ProviderReport[]>([]);
  const [providerTypes, setProviderTypes] = useState<ProviderTypeReport[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadCore = async () => {
    try {
      const [summaryResult, providerResult, vehicleResult, reservationResult, reportResult, typeResult] = await Promise.all([
        apiRequest<SummaryResponse>('/admin/resumen'),
        apiRequest<AdminProvider[]>('/admin/proveedores'),
        apiRequest<AdminVehicle[]>('/admin/vehiculos'),
        apiRequest<AdminReservation[]>('/admin/reservas'),
        apiRequest<ProviderReport[]>('/admin/reportes/proveedores'),
        apiRequest<ProviderTypeReport[]>('/admin/reportes/tipos-proveedor'),
      ]);
      setSummary(summaryResult);
      setProviders(providerResult);
      setVehicles(vehicleResult);
      setReservations(reservationResult);
      setReport(reportResult);
      setProviderTypes(typeResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el panel.');
    }
  };

  const loadUsers = async (page: number) => {
    try {
      const result = await apiRequest<PageResult<AdminUser>>(`/admin/usuarios?page=${page}&pageSize=10`);
      setUsers(result.items);
      setUsersTotal(result.total);
      setUsersTotalPages(result.totalPages);
      setUsersPage(result.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar los usuarios.');
    }
  };

  const loadAudit = async (page: number) => {
    try {
      const result = await apiRequest<PageResult<AuditEntry>>(`/admin/auditoria?page=${page}&pageSize=10`);
      setAudit(result.items);
      setAuditTotal(result.total);
      setAuditTotalPages(result.totalPages);
      setAuditPage(result.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar la auditoría.');
    }
  };

  const loadReviews = async (page: number) => {
    try {
      const result = await apiRequest<PageResult<AdminReview>>(`/admin/resenas?page=${page}&pageSize=10`);
      setReviews(result.items);
      setReviewsTotal(result.total);
      setReviewsTotalPages(result.totalPages);
      setReviewsPage(result.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las reseñas.');
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      apiRequest<SummaryResponse>('/admin/resumen'),
      apiRequest<AdminProvider[]>('/admin/proveedores'),
      apiRequest<AdminVehicle[]>('/admin/vehiculos'),
      apiRequest<AdminReservation[]>('/admin/reservas'),
      apiRequest<ProviderReport[]>('/admin/reportes/proveedores'),
      apiRequest<ProviderTypeReport[]>('/admin/reportes/tipos-proveedor'),
    ])
      .then(([summaryResult, providerResult, vehicleResult, reservationResult, reportResult, typeResult]) => {
        if (!active) return;
        setSummary(summaryResult);
        setProviders(providerResult);
        setVehicles(vehicleResult);
        setReservations(reservationResult);
        setReport(reportResult);
        setProviderTypes(typeResult);
      })
      .catch((requestError: Error) => {
        if (!active) return;
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    void loadUsers(1);
    void loadAudit(1);
    void loadReviews(1);

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateProviderState(providerId: number, estado: string) {
    if (estado === 'SUSPENDIDO' && !window.confirm('¿Suspender a este proveedor? Dejará de operar hasta que lo vuelvas a aprobar.')) return;
    if (estado === 'RECHAZADO' && !window.confirm('¿Rechazar a este proveedor? Su postulación quedará como rechazada.')) return;
    setBusyId(`p-${providerId}`);
    setError('');
    try {
      await apiRequest(`/admin/proveedores/${providerId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      await loadCore();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar el proveedor.');
    } finally {
      setBusyId('');
    }
  }

  async function updateVehiclePublication(vehicleId: number, estado: string) {
    setBusyId(`v-${vehicleId}`);
    setError('');
    try {
      await apiRequest(`/admin/vehiculos/${vehicleId}/publicacion`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      await loadCore();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar el vehículo.');
    } finally {
      setBusyId('');
    }
  }

  async function updateUserState(userId: number, activo: boolean) {
    if (!activo && !window.confirm('¿Desactivar a este usuario? Perderá el acceso al sistema.')) return;
    setBusyId(`u-${userId}`);
    try {
      await apiRequest(`/admin/usuarios/${userId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      });
      await loadUsers(usersPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar el usuario.');
    } finally {
      setBusyId('');
    }
  }

  async function updateUserRoles(userId: number, currentRoles: string | null, role: string) {
    const roles = new Set((currentRoles ?? '').split(',').map((value) => value.trim()).filter(Boolean));
    if (roles.has(role)) roles.delete(role);
    else roles.add(role);
    if (roles.size === 0) {
      setError('El usuario debe conservar al menos un rol.');
      return;
    }
    setBusyId(`r-${userId}`);
    try {
      await apiRequest(`/admin/usuarios/${userId}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roles: [...roles] }),
      });
      await loadUsers(usersPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar los roles.');
    } finally {
      setBusyId('');
    }
  }

  async function updateReviewVisibility(reviewId: number, visible: boolean) {
    setBusyId(`res-${reviewId}`);
    setError('');
    try {
      await apiRequest(`/admin/resenas/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ visible }),
      });
      await loadReviews(reviewsPage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible moderar la reseña.');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <main className="admin-page"><div className="loading-inline">Cargando panel de administración...</div></main>;

  const totals = summary?.totals;

  return (
    <main className="admin-page">
      <PageHeader
        eyebrow="PANEL DE ADMINISTRACIÓN"
        title="Supervisa el marketplace."
        description="Aprueba proveedores, publica flota y sigue el estado de las reservas."
      />

      {error && <Message tone="error" className="admin-alert">{error}</Message>}

      {totals && (
        <section className="kpi-grid" aria-label="Indicadores del sistema">
          <article className="kpi-card"><span className="profile-label">USUARIOS</span><strong>{totals.total_usuarios}</strong></article>
          <article className="kpi-card"><span className="profile-label">PROVEEDORES</span><strong>{totals.total_proveedores}</strong></article>
          <article className="kpi-card"><span className="profile-label">Vehículos en flota</span><strong>{totals.total_vehiculos}</strong></article>
          <article className="kpi-card"><span className="profile-label">RESERVAS</span><strong>{totals.total_reservas}</strong></article>
          <article className="kpi-card kpi-card-accent"><span className="profile-label">INGRESOS SIMULADOS</span><strong>${Number(totals.ingresos_simulados).toLocaleString('es-CL')}</strong></article>
        </section>
      )}

      <section className="admin-section">
        <SectionHeading eyebrow="USUARIOS" title="Gestiona acceso y estado"><span className="catalog-count">{usersTotal}</span></SectionHeading>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Roles</th><th>Confirmación</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.ID_usuario}>
                <td><strong>{user.nombres_persona} {user.apellido_paterno_persona}</strong></td>
                <td>{user.email_usuario}</td>
                <td><div className="admin-actions">{['CLIENTE', 'PROVEEDOR', 'ADMIN'].map((role) => <button key={role} className={user.roles?.includes(role) ? 'button button-primary button-small' : 'button button-outline button-small'} disabled={busyId === `r-${user.ID_usuario}`} onClick={() => updateUserRoles(user.ID_usuario, user.roles, role)}>{role}</button>)}</div></td>
                <td><span className={user.email_confirmado_usuario ? 'state-pill badge-aprobado' : 'state-pill badge-pendiente'}>{user.email_confirmado_usuario ? 'Confirmado' : 'Pendiente'}</span></td>
                <td><span className={user.activo_usuario ? 'state-pill badge-aprobado' : 'state-pill badge-rechazado'}>{user.activo_usuario ? 'Activo' : 'Inactivo'}</span></td>
                <td><button className="button button-outline button-small" disabled={busyId === `u-${user.ID_usuario}`} onClick={() => updateUserState(user.ID_usuario, !user.activo_usuario)}>{user.activo_usuario ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <PaginationControls page={usersPage} totalPages={usersTotalPages} onChange={(page) => { void loadUsers(page); }} />
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="GESTIÓN DE PROVEEDORES" title="Aprueba o suspende proveedores"><span className="catalog-count">{providers.length}</span></SectionHeading>
        {providers.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Aún no hay proveedores registrados.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Flota</th>
                  <th>Sedes</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.ID_proveedor}>
                    <td><strong>{provider.nombre_comercial_proveedor}</strong><span className="table-sub">{provider.rut_proveedor ?? provider.razon_social_proveedor ?? 'Sin documento'}</span></td>
                    <td>{provider.nombre_tipo_proveedor}</td>
                    <td><StatusBadge status={provider.nombre_estado_proveedor} variant="pill" /></td>
                    <td>{provider.total_vehiculos}</td>
                    <td>{provider.total_sedes}</td>
                    <td>{formatDate(provider.fecha_registro_proveedor)}</td>
                    <td>
                      <div className="admin-actions">
                        {provider.nombre_estado_proveedor !== 'APROBADO' && (
                          <button className="button button-primary button-small" disabled={busyId === `p-${provider.ID_proveedor}`} onClick={() => updateProviderState(provider.ID_proveedor, 'APROBADO')}>Aprobar</button>
                        )}
                        {provider.nombre_estado_proveedor === 'APROBADO' && (
                          <button className="button button-outline button-small" disabled={busyId === `p-${provider.ID_proveedor}`} onClick={() => updateProviderState(provider.ID_proveedor, 'SUSPENDIDO')}>Suspender</button>
                        )}
                        {provider.nombre_estado_proveedor !== 'RECHAZADO' && (
                          <button className="button button-outline button-small" disabled={busyId === `p-${provider.ID_proveedor}`} onClick={() => updateProviderState(provider.ID_proveedor, 'RECHAZADO')}>Rechazar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="GESTIÓN DE FLOTA" title="Publica o suspende vehículos"><span className="catalog-count">{vehicles.length}</span></SectionHeading>
        {vehicles.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Aún no hay vehículos registrados.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Patente</th>
                  <th>Proveedor</th>
                  <th>Precio diario</th>
                  <th>Estado</th>
                  <th>Publicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.ID_vehiculo}>
                    <td><strong>{vehicle.nombre_marca} {vehicle.nombre_modelo}</strong><span className="table-sub">{vehicle.nombre_tipo_vehiculo}</span></td>
                    <td>{vehicle.patente_vehiculo}</td>
                    <td>{vehicle.nombre_comercial_proveedor}</td>
                    <td>${Number(vehicle.precio_diario_base_vehiculo).toLocaleString('es-CL')}</td>
                    <td><StatusBadge status={vehicle.nombre_estado_vehiculo} variant="pill" /></td>
                    <td><StatusBadge status={vehicle.nombre_estado_publicacion_vehiculo} variant="pill" /></td>
                    <td>
                      <div className="admin-actions">
                        {vehicle.nombre_estado_publicacion_vehiculo !== 'PUBLICADO' && (
                          <button className="button button-primary button-small" disabled={busyId === `v-${vehicle.ID_vehiculo}`} onClick={() => updateVehiclePublication(vehicle.ID_vehiculo, 'PUBLICADO')}>Publicar</button>
                        )}
                        {vehicle.nombre_estado_publicacion_vehiculo === 'PUBLICADO' && (
                          <button className="button button-outline button-small" disabled={busyId === `v-${vehicle.ID_vehiculo}`} onClick={() => updateVehiclePublication(vehicle.ID_vehiculo, 'SUSPENDIDO')}>Suspender</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="SEGUIMIENTO" title="Reservas del sistema"><span className="catalog-count">{reservations.length}</span></SectionHeading>
        {reservations.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Aún no hay reservas registradas.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Proveedor</th>
                  <th>Rango</th>
                  <th>Reserva</th>
                  <th>Pago</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.ID_reserva}>
                    <td><strong>{reservation.nombre_cliente}</strong><span className="table-sub">{reservation.email_usuario}</span></td>
                    <td>{reservation.nombre_marca} {reservation.nombre_modelo}<span className="table-sub">{reservation.patente_vehiculo}</span></td>
                    <td>{reservation.nombre_comercial_proveedor}</td>
                    <td>{formatDate(reservation.fecha_inicio_reserva)} → {formatDate(reservation.fecha_fin_reserva)}</td>
                    <td><StatusBadge status={reservation.nombre_estado_reserva} variant="pill" /></td>
                    <td>{reservation.nombre_estado_pago ?? '—'}</td>
                    <td>{reservation.monto_pago !== null ? `$${Number(reservation.monto_pago).toLocaleString('es-CL')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="REPORTES" title="Resumen por proveedor"><span className="catalog-count">{report.length}</span></SectionHeading>

        {providerTypes.length > 0 && (
          <div className="report-types">
            {providerTypes.map((type) => (
              <div key={type.nombre_tipo_proveedor} className="report-type">
                <span className="profile-label">{type.nombre_tipo_proveedor}</span>
                <strong>{type.cantidad_proveedores}</strong>
              </div>
            ))}
          </div>
        )}

        {report.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Aún no hay proveedores para reportar.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Vehículos</th>
                  <th>Publicados</th>
                  <th>Reservas</th>
                  <th>Total pagado</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={row.ID_proveedor}>
                    <td><strong>{row.nombre_proveedor}</strong></td>
                    <td>{row.cantidad_vehiculos}</td>
                    <td>{row.cantidad_publicados}</td>
                    <td>{row.cantidad_reservas}</td>
                    <td>${Number(row.total_pagado).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="AUDITORÍA" title="Cambios de estado registrados por triggers"><span className="catalog-count">{auditTotal}</span></SectionHeading>
        {audit.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Sin movimientos de auditoría todavía.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tabla</th>
                  <th>Registro</th>
                  <th>Acción</th>
                  <th>Cambio</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.ID_auditoria}>
                    <td>{new Date(entry.fecha_hora_auditoria).toLocaleString('es-CL')}</td>
                    <td>{entry.tabla_afectada_auditoria}</td>
                    <td>{entry.ID_registro_auditoria ?? '—'}</td>
                    <td><span className="state-pill badge-suspendido">{entry.accion_auditoria}</span></td>
                    <td>
                      {entry.valor_anterior_auditoria || entry.valor_nuevo_auditoria
                        ? `${entry.valor_anterior_auditoria ?? '—'} → ${entry.valor_nuevo_auditoria ?? '—'}`
                        : entry.descripcion_auditoria ?? '—'}
                    </td>
                    <td><strong>{entry.nombre_usuario}</strong><span className="table-sub">{entry.email_usuario ?? 'Sin usuario'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls page={auditPage} totalPages={auditTotalPages} onChange={(page) => { void loadAudit(page); }} />
      </section>

      <section className="admin-section">
        <SectionHeading eyebrow="RESEÑAS" title="Modera el contenido mostrado"><span className="catalog-count">{reviewsTotal}</span></SectionHeading>
        {reviews.length === 0 ? (
          <div className="empty-state compact-empty"><span>✦</span><p>Sin reseñas registradas todavía.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Proveedor</th>
                  <th>Calificación</th>
                  <th>Comentario</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.ID_resena}>
                    <td><strong>{review.nombre_cliente}</strong></td>
                    <td>{review.nombre_marca} {review.nombre_modelo}<span className="table-sub">{review.patente_vehiculo}</span></td>
                    <td>{review.nombre_comercial_proveedor}</td>
                    <td>{"★".repeat(review.calificacion_resena)}{"☆".repeat(5 - review.calificacion_resena)}</td>
                    <td>{review.comentario_resena ?? '—'}</td>
                    <td>{formatDate(review.fecha_resena)}</td>
                    <td><StatusBadge status={review.activo_resena ? 'APROBADA' : 'OCULTA'} variant="pill" /></td>
                    <td>
                      <button className="button button-outline button-small" disabled={busyId === `res-${review.ID_resena}`} onClick={() => updateReviewVisibility(review.ID_resena, !review.activo_resena)}>
                        {review.activo_resena ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls page={reviewsPage} totalPages={reviewsTotalPages} onChange={(page) => { void loadReviews(page); }} />
      </section>
    </main>
  );
}
