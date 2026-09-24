import { Link } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export function HomePage() {
  const { user } = useAuth();

  return (
    <main className="home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">MOVILIDAD SIN FRONTERAS</span>
          <h1>Encuentra el vehículo ideal para tu próximo viaje.</h1>
          <p>
            RentaCar conecta personas y proveedores independientes para que puedas
            comparar, reservar y arrendar vehículos de forma simple.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/registro">
              Comenzar ahora
            </Link>
            <Link className="button button-quiet" to="/vehiculos">
              Explorar vehículos
            </Link>
            <Link className="button button-quiet" to="/login">
              Ya tengo una cuenta
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-label="Ilustración de un vehículo" role="img">
          <div className="sun-glow" />
          <div className="road-line" />
          <div className="car-shape">
            <div className="car-window car-window-back" />
            <div className="car-window car-window-front" />
            <div className="car-body" />
            <span className="wheel wheel-back" />
            <span className="wheel wheel-front" />
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Beneficios de RentaCar">
        <article className="feature-card">
          <span className="feature-number">01</span>
          <h2>Proveedores reales</h2>
          <p>Elige entre flotas de empresas y vehículos de personas naturales.</p>
        </article>
        <article className="feature-card feature-card-accent">
          <span className="feature-number">02</span>
          <h2>Reserva clara</h2>
          <p>Consulta fechas, sedes, precios y condiciones antes de confirmar.</p>
        </article>
        <article className="feature-card">
          <span className="feature-number">03</span>
          <h2>Todo en un lugar</h2>
          <p>Gestiona tus reservas, pagos y arriendos desde tu cuenta.</p>
        </article>
      </section>

      {user && (
        <section className="welcome-strip">
          <p>Tu sesión está activa.</p>
          <Link to="/perfil">Ir a mi perfil</Link>
        </section>
      )}
    </main>
  );
}
