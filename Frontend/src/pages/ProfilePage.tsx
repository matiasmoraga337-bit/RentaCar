import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { Message } from '../components/Message';
import { EmptyState } from '../components/EmptyState';
import { ReservationCard } from '../components/ReservationCard';
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
  const { user, profile, logout, refreshProfile } = useAuth();
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reviewingFor, setReviewingFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

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
    if (!window.confirm('¿Cancelar esta reserva? Se reembolsará el pago simulado si corresponde.')) return;
    try {
      await apiRequest(`/reservas/${reservationId}/cancelar`, { method: 'PATCH' });
      loadReservations();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible cancelar la reserva.');
    }
  }

  async function handlePayNow(reservationId: number) {
    setPageError('');
    try {
      const payment = await apiRequest<{ redirectUrl: string }>('/pagos/simulados/iniciar', {
        method: 'POST',
        body: JSON.stringify({ reservationId }),
      });
      navigate(payment.redirectUrl);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible iniciar el pago.');
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

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setProfileMessage('');
    try {
      await apiRequest('/auth/perfil', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      await refreshProfile();
      setProfileMessage('Perfil actualizado.');
      setEditingProfile(false);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No fue posible actualizar el perfil.');
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setPwMessage('');
    setPwError('');
    setPageError('');

    if (values.nuevaPassword !== values.confirmacion) {
      setPwError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setPwSubmitting(true);
    try {
      await apiRequest('/auth/cambiar-contrasena', {
        method: 'POST',
        body: JSON.stringify({
          actualPassword: values.actualPassword,
          nuevaPassword: values.nuevaPassword,
        }),
      });
      setPwMessage('Contraseña actualizada. Vuelve a iniciar sesión.');
      window.setTimeout(() => {
        logout();
        navigate('/login');
      }, 1200);
    } catch (error) {
      setPwError(error instanceof Error ? error.message : 'No fue posible cambiar la contraseña.');
    } finally {
      setPwSubmitting(false);
    }
  }

  const canCancel = (reservation: MyReservation) =>
    reservation.nombre_estado_reserva === 'PENDIENTE' || reservation.nombre_estado_reserva === 'CONFIRMADA';

  const canReview = (reservation: MyReservation) =>
    reservation.estado_arriendo === 'FINALIZADO' && reservation.resenado === 0;

  return (
    <main className="profile-page">
      <PageHeader
        eyebrow="MI CUENTA"
        title="Tu perfil RentaCar"
        description="Administra tus datos, reservas y arriendos."
        action={<button className="button button-outline" onClick={handleLogout}>Cerrar sesión</button>}
      />

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

      <section className="profile-edit-section">
        <SectionHeading eyebrow="DATOS PERSONALES" title="Tu información">
          <button className="button button-outline button-small" onClick={() => setEditingProfile((current) => !current)}>{editingProfile ? 'Cerrar' : 'Editar'}</button>
        </SectionHeading>
        {profileMessage && <Message tone="success">{profileMessage}</Message>}
        {editingProfile && profile && (
          <form className="profile-edit-form" onSubmit={handleProfileUpdate}>
            <label>Nombres<input name="nombres" defaultValue={profile.nombres_persona} required /></label>
            <label>Apellido paterno<input name="apellidoPaterno" defaultValue={profile.apellido_paterno_persona} required /></label>
            <label>Apellido materno<input name="apellidoMaterno" defaultValue={profile.apellido_materno_persona ?? ''} /></label>
            <label>Teléfono<input name="telefono" defaultValue={profile.telefono_persona ?? ''} /></label>
            <button className="button button-primary" type="submit">Guardar cambios</button>
          </form>
        )}
      </section>

      <section className="profile-edit-section">
        <SectionHeading eyebrow="SEGURIDAD" title="Cambia tu contraseña" />
        {pwMessage && <Message tone="success">{pwMessage}</Message>}
        {pwError && <Message tone="error">{pwError}</Message>}
        <form className="profile-edit-form" onSubmit={handlePasswordChange}>
          <label>Contraseña actual<input name="actualPassword" type="password" autoComplete="current-password" required /></label>
          <label>Nueva contraseña<input name="nuevaPassword" type="password" minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" required /></label>
          <label>Confirmar nueva contraseña<input name="confirmacion" type="password" minLength={8} autoComplete="new-password" required /></label>
          <button className="button button-primary" disabled={pwSubmitting}>{pwSubmitting ? 'Guardando...' : 'Actualizar contraseña'}</button>
        </form>
      </section>

      <section className="reservations-section">
        <SectionHeading title="Mis reservas" subtitle="Historial completo" />
        {pageError && <Message tone="error" className="catalog-message">{pageError}</Message>}
        {loading ? (
          <p className="loading-inline">Cargando reservas...</p>
        ) : reservations.length === 0 ? (
          <EmptyState title="Aún no tienes reservas" copy="Explora el catálogo para arrendar tu próximo vehículo." />
        ) : (
          <div className="reservations-list">
            {reservations.map((reservation) => (
              <ReservationCard
                key={reservation.ID_reserva}
                title={`${reservation.nombre_marca} ${reservation.nombre_modelo}`}
                plate={reservation.patente_vehiculo}
                status={reservation.nombre_estado_reserva}
                meta={[
                  { label: 'Retiro', value: `${new Date(reservation.fecha_inicio_reserva).toLocaleDateString('es-CL')} · ${reservation.sede_retiro}` },
                  { label: 'Devolución', value: `${new Date(reservation.fecha_fin_reserva).toLocaleDateString('es-CL')} · ${reservation.sede_devolucion}` },
                  { label: 'Proveedor', value: reservation.nombre_comercial_proveedor },
                  { label: 'Pago', value: `${reservation.nombre_estado_pago ?? 'Sin pago'}${reservation.monto_pago ? ` · $${Number(reservation.monto_pago).toLocaleString('es-CL')}` : ''}` },
                  ...(reservation.estado_arriendo ? [{ label: 'Arriendo', value: reservation.estado_arriendo }] : []),
                ]}
                actions={canCancel(reservation) || reservation.nombre_estado_reserva === 'PENDIENTE' ? (
                  <>
                    {reservation.nombre_estado_reserva === 'PENDIENTE' && (
                      <button className="button button-primary button-small" onClick={() => handlePayNow(reservation.ID_reserva)}>Pagar ahora</button>
                    )}
                    {canCancel(reservation) && (
                      <button className="button button-outline button-small" onClick={() => handleCancel(reservation.ID_reserva)}>Cancelar reserva</button>
                    )}
                  </>
                ) : undefined}
              >
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
              </ReservationCard>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}