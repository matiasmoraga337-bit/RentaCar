import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import { apiRequest } from '../services/api';

interface MyReservation {
  ID_reserva: number;
  fecha_inicio_reserva: string;
  fecha_fin_reserva: string;
  precio_diario_aplicado_reserva: number;
  nombre_marca: string;
  nombre_modelo: string;
  patente_vehiculo: string;
  nombre_comercial_proveedor: string;
  sede_retiro: string;
  sede_devolucion: string;
  nombre_estado_reserva: string;
  ID_arriendo: number | null;
  estado_arriendo: string | null;
  resenado: number | null;
  nombre_estado_pago: string | null;
  monto_pago: number | null;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reviewingFor, setReviewingFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadReservations() {
    apiRequest<MyReservation[]>('/reservas/mis-reservas')
      .then(setReservations)
      .catch((error: Error) => setPageError(error.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadReservations, []);

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleCancel(reservationId: number) {
    try {
      await apiRequest(`/reservas/${reservationId}/cancelar`, { method: 'PATCH' });
      loadReservations();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible cancelar la reserva.');
    }
  }

  async function handleReview(event: FormEvent<HTMLFormElement>, arriendoId: number) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest(`/arriendos/${arriendoId}/resenas`, {
        method: 'POST',
        body: JSON.stringify({ calificacion: rating, comentario: comment.trim() || null }),
      });
      setReviewingFor(null);
      setComment('');
      setRating(5);
      loadReservations();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible guardar la reseña.');
    } finally {
      setSubmitting(false);
    }
  }

  const canCancel = (reservation: MyReservation) =>
    reservation.nombre_estado_reserva === 'PENDIENTE' || reservation.nombre_estado_reserva === 'CONFIRMADA';

  const canReview = (reservation: MyReservation) =>
    reservation.estado_arriendo === 'FINALIZADO' && reservation.resenado === 0;

  return (
    <main className="profile-page">
      <section className="profile-header">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>Tu perfil RentaCar</h1>
          <p>Administra tus datos, reservas y arriendos.</p>
        </div>
        <button className="button button-outline" onClick={handleLogout}>Cerrar sesión</button>
      </section>
      <section className="profile-grid">
        <article className="profile-card profile-card-highlight">
          <span className="profile-label">USUARIO</span>
          <strong>{profile ? `${profile.nombres_persona} ${profile.apellido_paterno_persona}` : 'Cargando...'}</strong>
          <p>{user?.email}</p>
        </article>
        <article className="profile-card">
          <span className="profile-label">ROL</span>
          <strong>{user?.roles.join(' · ')}</strong>
          <p>Acceso de cliente activo</p>
        </article>
        <article className="profile-card">
          <span className="profile-label">RESERVAS</span>
          <strong>{reservations.length}</strong>
          <p>Historial registrado en tu cuenta</p>
        </article>
      </section>

      <section className="reservations-section">
        <div className="section-heading">
          <h2>Mis reservas</h2>
          <span>Historial completo</span>
        </div>
        {pageError && <p className="form-error" role="alert">{pageError}</p>}
        {loading ? (
          <p className="loading-state">Cargando reservas...</p>
        ) : reservations.length === 0 ? (
          <p className="reviews-empty">Aún no tienes reservas. Explora el catálogo para arrendar tu próximo vehículo.</p>
        ) : (
          <div className="reservations-list">
            {reservations.map((reservation) => (
              <article key={reservation.ID_reserva} className={`reservation-card ${reservation.nombre_estado_reserva.toLowerCase()}`}>
                <header className="reservation-header">
                  <div>
                    <strong>{reservation.nombre_marca} {reservation.nombre_modelo}</strong>
                    <span className="reservation-plate">{reservation.patente_vehiculo}</span>
                  </div>
                  <span className={`status-badge status-${reservation.nombre_estado_reserva.toLowerCase()}`}>{reservation.nombre_estado_reserva}</span>
                </header>
                <dl className="reservation-meta">
                  <div><dt>Retiro</dt><dd>{new Date(reservation.fecha_inicio_reserva).toLocaleDateString('es-CL')} · {reservation.sede_retiro}</dd></div>
                  <div><dt>Devolución</dt><dd>{new Date(reservation.fecha_fin_reserva).toLocaleDateString('es-CL')} · {reservation.sede_devolucion}</dd></div>
                  <div><dt>Proveedor</dt><dd>{reservation.nombre_comercial_proveedor}</dd></div>
                  <div><dt>Pago</dt><dd>{reservation.nombre_estado_pago ?? 'Sin pago'} {reservation.monto_pago ? `· $${Number(reservation.monto_pago).toLocaleString('es-CL')}` : ''}</dd></div>
                  {reservation.estado_arriendo && (
                    <div><dt>Arriendo</dt><dd>{reservation.estado_arriendo}</dd></div>
                  )}
                </dl>

                {canReview(reservation) && (
                  <div className="review-form-box">
                    {reviewingFor === reservation.ID_arriendo ? (
                      <form className="review-form" onSubmit={(event) => handleReview(event, reservation.ID_arriendo!)}>
                        <label>Calificación
                          <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                            <option value={1}>1 - Muy malo</option>
                            <option value={2}>2 - Malo</option>
                            <option value={3}>3 - Regular</option>
                            <option value={4}>4 - Bueno</option>
                            <option value={5}>5 - Excelente</option>
                          </select>
                        </label>
                        <label>Comentario
                          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Cuéntanos tu experiencia..." rows={3} />
                        </label>
                        <div className="review-actions">
                          <button className="button button-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Publicar reseña'}</button>
                          <button type="button" className="button button-outline" onClick={() => setReviewingFor(null)}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <button className="button button-outline button-small" onClick={() => setReviewingFor(reservation.ID_arriendo)}>★ Calificar mi arriendo</button>
                    )}
                  </div>
                )}

                {canCancel(reservation) && (
                  <div className="reservation-actions">
                    <button className="button button-outline button-small" onClick={() => handleCancel(reservation.ID_reserva)}>Cancelar reserva</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}