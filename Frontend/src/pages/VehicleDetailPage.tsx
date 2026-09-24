import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import { apiRequest } from '../services/api';

interface Vehicle {
  ID_vehiculo: number;
  precio_diario_base_vehiculo: number;
  nombre_comercial_proveedor: string;
  nombre_marca: string;
  nombre_modelo: string;
  nombre_tipo_vehiculo: string;
  nombre_comuna?: string | null;
  nombre_region?: string | null;
}

interface VehicleDetail {
  vehicle: Vehicle;
  branches: { ID_sede_proveedor: number; nombre_sede_proveedor: string; direccion_sede_proveedor: string }[];
}

interface VehicleReviews {
  items: {
    ID_resena: number;
    calificacion_resena: number;
    comentario_resena: string | null;
    fecha_resena: string;
    nombre_cliente: string;
  }[];
  total: number;
  promedio: number | null;
}

export function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [reviews, setReviews] = useState<VehicleReviews | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<VehicleDetail>(`/vehiculos/${id}`),
      apiRequest<VehicleReviews>(`/vehiculos/${id}/resenas`),
    ])
      .then(([result, reviewsResult]) => {
        setDetail(result);
        setReviews(reviewsResult);
        if (result.branches[0]) setBranchId(String(result.branches[0].ID_sede_proveedor));
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [id]);

  function calculateDays() {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime();
    return Math.max(0, Math.ceil((end - start) / 86400000));
  }

  async function handleReserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !user) return;

    setSubmitting(true);
    setMessage('');
    setError('');
    const days = calculateDays();

    if (!branchId || days <= 0) {
      setError('Selecciona una sede y un rango de fechas válido.');
      setSubmitting(false);
      return;
    }

    try {
      const reservation = await apiRequest<{ ID_reserva: number }>('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          idVehiculo: detail.vehicle.ID_vehiculo,
          idSedeRetiro: Number(branchId),
          idSedeDevolucion: Number(branchId),
          fechaInicio: startDate,
          fechaFin: endDate,
        }),
      });

      await apiRequest(`/reservas/${reservation.ID_reserva}/pagos`, {
        method: 'POST',
        body: JSON.stringify({
          idMetodoPago: 1,
          montoPago: days * Number(detail.vehicle.precio_diario_base_vehiculo),
          aprobado: true,
          referencia: `SIM-${reservation.ID_reserva}`,
        }),
      });

      setMessage('Reserva confirmada y pago simulado aprobado.');
      setTimeout(() => navigate('/perfil'), 900);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la reserva.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !detail) {
    return <main className="catalog-page"><p className="form-error" role="alert">{error}</p></main>;
  }

  if (!detail) {
    return <div className="loading-state">Cargando vehículo...</div>;
  }

  const { vehicle } = detail;
  const days = calculateDays();
  const total = days * Number(vehicle.precio_diario_base_vehiculo);

  return (
    <main className="detail-page">
      <Link className="back-link" to="/vehiculos">← Volver al catálogo</Link>
      <section className="detail-layout">
        <div className="detail-visual">
          <span>{vehicle.nombre_tipo_vehiculo}</span>
          <div className="detail-car" />
        </div>
        <div className="detail-content">
          <span className="vehicle-provider">{vehicle.nombre_comercial_proveedor}</span>
          <h1>{vehicle.nombre_marca} {vehicle.nombre_modelo}</h1>
          <p>{vehicle.nombre_comuna ?? 'Ubicación por confirmar'}, {vehicle.nombre_region ?? 'Chile'}</p>
          <div className="detail-price"><strong>${Number(vehicle.precio_diario_base_vehiculo).toLocaleString('es-CL')}</strong><span>por día</span></div>

          {user ? (
            <form className="reservation-form" onSubmit={handleReserve}>
              <h2>Reserva tu vehículo</h2>
              <label>Fecha de retiro<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
              <label>Fecha de devolución<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
              <label>Sede de retiro y devolución
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                  <option value="">Selecciona una sede</option>
                  {detail.branches.map((branch) => <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>)}
                </select>
              </label>
              {days > 0 && <div className="total-line"><span>{days} días</span><strong>${total.toLocaleString('es-CL')}</strong></div>}
              {message && <p className="success-message" role="status">{message}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-full" disabled={submitting}>{submitting ? 'Procesando...' : 'Reservar y pagar'}</button>
            </form>
          ) : (
            <div className="login-callout"><p>Inicia sesión para reservar este vehículo.</p><Link className="button button-primary" to="/login">Iniciar sesión</Link></div>
          )}
        </div>
      </section>
      <section className="reviews-section">
        <div className="reviews-heading">
          <h2>Reseñas de clientes</h2>
          {reviews && reviews.promedio !== null && (
            <span className="reviews-avg">★ {reviews.promedio} <small>({reviews.total} reseñas)</small></span>
          )}
        </div>
        {reviews && reviews.items.length > 0 ? (
          <div className="reviews-list">
            {reviews.items.map((review) => (
              <article key={review.ID_resena} className="review-card">
                <div className="review-stars">{"★".repeat(review.calificacion_resena)}{"☆".repeat(5 - review.calificacion_resena)}</div>
                {review.comentario_resena && <p>{review.comentario_resena}</p>}
                <footer>
                  <strong>{review.nombre_cliente}</strong>
                  <span>{new Date(review.fecha_resena).toLocaleDateString('es-CL')}</span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <p className="reviews-empty">Aún no hay reseñas para este vehículo. Sé el primero en calificar tu arriendo.</p>
        )}
      </section>
    </main>
  );
}
