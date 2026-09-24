import { useEffect, useState } from 'react';

import { useAuth } from '../context/useAuth';
import { apiRequest } from '../services/api';

interface PendingReservation {
  ID_reserva: number;
  fecha_inicio_reserva: string;
  fecha_fin_reserva: string;
  nombre_cliente: string;
  email_usuario: string;
  ID_vehiculo: number;
  patente_vehiculo: string;
  nombre_marca: string;
  nombre_modelo: string;
  ID_proveedor: number;
  nombre_comercial_proveedor: string;
  sede_retiro: string;
  sede_devolucion: string;
  monto_pago: number | null;
}

interface Rental {
  ID_arriendo: number;
  ID_reserva_arriendo: number;
  ID_sede_retiro_real_arriendo: number;
  sede_retiro_real: string;
  ID_sede_devolucion_real_arriendo: number | null;
  sede_devolucion_real: string | null;
  fecha_hora_retiro_real_arriendo: string;
  fecha_hora_devolucion_real_arriendo: string | null;
  kilometraje_inicial_arriendo: number;
  kilometraje_final_arriendo: number | null;
  combustible_inicial_arriendo: number;
  combustible_final_arriendo: number | null;
  nombre_estado_arriendo: string;
  nombre_estado_reserva: string;
  nombre_cliente: string;
  email_usuario: string;
  nombre_estado_pago: string | null;
  monto_pago: number | null;
  ID_vehiculo: number;
  patente_vehiculo: string;
  nombre_marca: string;
  nombre_modelo: string;
  ID_proveedor: number;
  nombre_comercial_proveedor: string;
  resenado: number;
}

interface Branch {
  ID_sede_proveedor: number;
  nombre_sede_proveedor: string;
}

type Operation =
  | { kind: 'inicio'; reserva: PendingReservation }
  | { kind: 'devolucion'; arriendo: Rental };

export function OperationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Rental[]>([]);
  const [pendientes, setPendientes] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({ branchId: '', km: '', fuel: '' });
  const [submitting, setSubmitting] = useState(false);

  const isProviderOrAdmin = user?.roles.some((role) => role === 'PROVEEDOR' || role === 'ADMIN') ?? false;

  function load() {
    apiRequest<{ items: Rental[]; pendientes: PendingReservation[] }>('/arriendos')
      .then((result) => {
        setItems(result.items);
        setPendientes(result.pendientes);
      })
      .catch((error: Error) => setPageError(error.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function openOperation(next: Operation) {
    setPageError('');
    setFormData({ branchId: '', km: '', fuel: '' });
    const providerId = next.kind === 'inicio' ? next.reserva.ID_proveedor : next.arriendo.ID_proveedor;
    setOperation(next);
    try {
      const result = await apiRequest<Branch[]>(`/proveedores/${providerId}/sedes`);
      setBranches(result);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible cargar las sedes.');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operation) return;

    setSubmitting(true);
    setPageError('');
    try {
      if (operation.kind === 'inicio') {
        await apiRequest('/arriendos', {
          method: 'POST',
          body: JSON.stringify({
            ID_reserva: operation.reserva.ID_reserva,
            ID_sede_retiro_real: Number(formData.branchId),
            kilometraje_inicial: Number(formData.km),
            combustible_inicial: Number(formData.fuel),
          }),
        });
      } else {
        await apiRequest(`/arriendos/${operation.arriendo.ID_arriendo}/devolucion`, {
          method: 'POST',
          body: JSON.stringify({
            ID_sede_devolucion_real: Number(formData.branchId),
            kilometraje_final: Number(formData.km),
            combustible_final: Number(formData.fuel),
          }),
        });
      }
      setOperation(null);
      load();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible procesar la operación.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldsValid = formData.branchId && formData.km !== '' && formData.fuel !== '';

  return (
    <main className="operations-page">
      <section className="profile-header">
        <div>
          <span className="eyebrow">OPERACIONES</span>
          <h1>Arriendos de tu flota</h1>
          <p>Inicia los arriendos confirmados y registra las devoluciones.</p>
        </div>
      </section>

      {!isProviderOrAdmin && (
        <p className="form-error" role="alert">No tienes acceso a las operaciones.</p>
      )}

      {pageError && <p className="form-error" role="alert">{pageError}</p>}

      <section className="reservations-section">
        <div className="section-heading">
          <h2>Reservas confirmadas sin iniciar</h2>
          <span>{pendientes.length} pendiente(s)</span>
        </div>

        {loading ? (
          <p className="loading-state">Cargando...</p>
        ) : pendientes.length === 0 ? (
          <p className="reviews-empty">No hay reservas confirmadas esperando inicio de arriendo.</p>
        ) : (
          <div className="reservations-list">
            {pendientes.map((reserva) => (
              <article key={reserva.ID_reserva} className="reservation-card confirmed">
                <header className="reservation-header">
                  <div>
                    <strong>{reserva.nombre_marca} {reserva.nombre_modelo}</strong>
                    <span className="reservation-plate">{reserva.patente_vehiculo}</span>
                  </div>
                  <span className="status-badge status-confirmada">CONFIRMADA</span>
                </header>
                <dl className="reservation-meta">
                  <div><dt>Cliente</dt><dd>{reserva.nombre_cliente} · {reserva.email_usuario}</dd></div>
                  <div><dt>Retiro</dt><dd>{new Date(reserva.fecha_inicio_reserva).toLocaleDateString('es-CL')} · {reserva.sede_retiro}</dd></div>
                  <div><dt>Devolución</dt><dd>{new Date(reserva.fecha_fin_reserva).toLocaleDateString('es-CL')} · {reserva.sede_devolucion}</dd></div>
                  <div><dt>Pagado</dt><dd>{reserva.monto_pago ? `$${Number(reserva.monto_pago).toLocaleString('es-CL')}` : 'Sin registro'}</dd></div>
                </dl>
                <div className="reservation-actions">
                  <button className="button button-primary button-small" onClick={() => openOperation({ kind: 'inicio', reserva })}>Iniciar arriendo</button>
                </div>

                {operation?.kind === 'inicio' && operation.reserva.ID_reserva === reserva.ID_reserva && (
                  <form className="inline-operations-form" onSubmit={handleSubmit}>
                    <label>Sede real de retiro
                      <select value={formData.branchId} onChange={(event) => setFormData({ ...formData, branchId: event.target.value })} required>
                        <option value="">Selecciona una sede</option>
                        {branches.map((branch) => <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>)}
                      </select>
                    </label>
                    <label>Kilometraje inicial<input type="number" min={0} value={formData.km} onChange={(event) => setFormData({ ...formData, km: event.target.value })} required /></label>
                    <label>Combustible inicial (0-100)%<input type="number" min={0} max={100} value={formData.fuel} onChange={(event) => setFormData({ ...formData, fuel: event.target.value })} required /></label>
                    <div className="review-actions">
                      <button className="button button-primary" disabled={submitting || !fieldsValid}>{submitting ? 'Procesando...' : 'Confirmar inicio'}</button>
                      <button type="button" className="button button-outline" onClick={() => setOperation(null)}>Cancelar</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="reservations-section">
        <div className="section-heading">
          <h2>Arriendos</h2>
          <span>{items.length} registro(s)</span>
        </div>

        {items.length === 0 && !loading ? (
          <p className="reviews-empty">Todavía no hay arriendos registrados.</p>
        ) : (
          <div className="reservations-list">
            {items.map((arriendo) => (
              <article key={arriendo.ID_arriendo} className={`reservation-card ${arriendo.nombre_estado_arriendo.toLowerCase()}`}>
                <header className="reservation-header">
                  <div>
                    <strong>{arriendo.nombre_marca} {arriendo.nombre_modelo}</strong>
                    <span className="reservation-plate">{arriendo.patente_vehiculo}</span>
                  </div>
                  <span className={`status-badge status-${arriendo.nombre_estado_arriendo.toLowerCase()}`}>{arriendo.nombre_estado_arriendo}</span>
                </header>
                <dl className="reservation-meta">
                  <div><dt>Cliente</dt><dd>{arriendo.nombre_cliente} · {arriendo.email_usuario}</dd></div>
                  <div><dt>Retiro real</dt><dd>{new Date(arriendo.fecha_hora_retiro_real_arriendo).toLocaleString('es-CL')} · {arriendo.sede_retiro_real}</dd></div>
                  <div><dt>Km inicial</dt><dd>{arriendo.kilometraje_inicial_arriendo.toLocaleString('es-CL')} km · Combustible {arriendo.combustible_inicial_arriendo}%</dd></div>
                  {arriendo.kilometraje_final_arriendo !== null && (
                    <div><dt>Devolución</dt><dd>{arriendo.fecha_hora_devolucion_real_arriendo ? new Date(arriendo.fecha_hora_devolucion_real_arriendo).toLocaleString('es-CL') : ''} · {arriendo.sede_devolucion_real ?? ''}</dd></div>
                  )}
                  {arriendo.kilometraje_final_arriendo !== null && (
                    <div><dt>Km final</dt><dd>{arriendo.kilometraje_final_arriendo.toLocaleString('es-CL')} km · Combustible {arriendo.combustible_final_arriendo}%</dd></div>
                  )}
                  <div><dt>Reseña</dt><dd>{arriendo.resenado === 1 ? 'Publicada' : 'Pendiente'}</dd></div>
                </dl>

                {arriendo.nombre_estado_arriendo === 'ACTIVO' && (
                  <div className="reservation-actions">
                    <button className="button button-primary button-small" onClick={() => openOperation({ kind: 'devolucion', arriendo })}>Registrar devolución</button>
                  </div>
                )}

                {operation?.kind === 'devolucion' && operation.arriendo.ID_arriendo === arriendo.ID_arriendo && (
                  <form className="inline-operations-form" onSubmit={handleSubmit}>
                    <label>Sede real de devolución
                      <select value={formData.branchId} onChange={(event) => setFormData({ ...formData, branchId: event.target.value })} required>
                        <option value="">Selecciona una sede</option>
                        {branches.map((branch) => <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>)}
                      </select>
                    </label>
                    <label>Kilometraje final<input type="number" min={0} value={formData.km} onChange={(event) => setFormData({ ...formData, km: event.target.value })} required /></label>
                    <label>Combustible final (0-100)%<input type="number" min={0} max={100} value={formData.fuel} onChange={(event) => setFormData({ ...formData, fuel: event.target.value })} required /></label>
                    <div className="review-actions">
                      <button className="button button-primary" disabled={submitting || !fieldsValid}>{submitting ? 'Procesando...' : 'Confirmar devolución'}</button>
                      <button type="button" className="button button-outline" onClick={() => setOperation(null)}>Cancelar</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}