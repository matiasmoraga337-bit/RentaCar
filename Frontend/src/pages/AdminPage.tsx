import { useEffect, useState } from 'react';

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

function badgeClass(value: string) {
  const key = value.toUpperCase();
  if (key.includes('APROBADO') || key.includes('PUBLICADO') || key.includes('COMPLETADA') || key.includes('CONFIRMADA')) return 'state-pill badge-aprobado';
  if (key.includes('PENDIENTE')) return 'state-pill badge-pendiente';
  if (key.includes('RECHAZADO') || key.includes('CANCELADA') || key.includes('REEMBOLSADO')) return 'state-pill badge-rechazado';
  return 'state-pill badge-suspendido';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadAll = async () => {
    try {
      const [summaryResult, providerResult, vehicleResult, reservationResult] = await Promise.all([
        apiRequest<SummaryResponse>('/admin/resumen'),
        apiRequest<AdminProvider[]>('/admin/proveedores'),
        apiRequest<AdminVehicle[]>('/admin/vehiculos'),
        apiRequest<AdminReservation[]>('/admin/reservas'),
      ]);
      setSummary(summaryResult);
      setProviders(providerResult);
      setVehicles(vehicleResult);
      setReservations(reservationResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      apiRequest<SummaryResponse>('/admin/resumen'),
      apiRequest<AdminProvider[]>('/admin/proveedores'),
      apiRequest<AdminVehicle[]>('/admin/vehiculos'),
      apiRequest<AdminReservation[]>('/admin/reservas'),
    ])
      .then(([summaryResult, providerResult, vehicleResult, reservationResult]) => {
        if (!active) return;
        setSummary(summaryResult);
        setProviders(providerResult);
        setVehicles(vehicleResult);
        setReservations(reservationResult);
      })
      .catch((requestError: Error) => {
        if (!active) return;
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateProviderState(providerId: number, estado: string) {
    setBusyId(`p-${providerId}`);
    setError('');
    try {
      await apiRequest(`/admin/proveedores/${providerId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      await loadAll();
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
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar el vehículo.');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <main className="admin-page"><div className="loading-inline">Cargando panel de administración...</div></main>;

  const totals = summary?.totals;

  return (
    <main className="admin-page">
      <section className="profile-header">
        <div>
          <span className="eyebrow">PANEL DE ADMINISTRACIÓN</span>
          <h1>Supervisa el marketplace.</h1>
          <p>Aprueba proveedores, publica flota y sigue el estado de las reservas.</p>
        </div>
      </section>

      {error && <p className="form-error admin-alert" role="alert">{error}</p>}

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
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTIÓN DE PROVEEDORES</span>
            <h2>Aprueba o suspende proveedores</h2>
          </div>
          <span className="catalog-count">{providers.length}</span>
        </div>
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
                    <td><span className={badgeClass(provider.nombre_estado_proveedor)}>{provider.nombre_estado_proveedor}</span></td>
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
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTIÓN DE FLOTA</span>
            <h2>Publica o suspende vehículos</h2>
          </div>
          <span className="catalog-count">{vehicles.length}</span>
        </div>
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
                    <td><span className={badgeClass(vehicle.nombre_estado_vehiculo)}>{vehicle.nombre_estado_vehiculo}</span></td>
                    <td><span className={badgeClass(vehicle.nombre_estado_publicacion_vehiculo)}>{vehicle.nombre_estado_publicacion_vehiculo}</span></td>
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
        <div className="section-heading">
          <div>
            <span className="eyebrow">SEGUIMIENTO</span>
            <h2>Reservas del sistema</h2>
          </div>
          <span className="catalog-count">{reservations.length}</span>
        </div>
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
                    <td><span className={badgeClass(reservation.nombre_estado_reserva)}>{reservation.nombre_estado_reserva}</span></td>
                    <td>{reservation.nombre_estado_pago ?? '—'}</td>
                    <td>{reservation.monto_pago !== null ? `$${Number(reservation.monto_pago).toLocaleString('es-CL')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}