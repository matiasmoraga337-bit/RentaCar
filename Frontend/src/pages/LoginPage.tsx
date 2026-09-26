import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';
import { apiRequest } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/perfil');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      const result = await apiRequest<{ message: string }>('/auth/reenviar-confirmacion', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResendMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible reenviar el correo.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">BIENVENIDO DE VUELTA</span>
        <h1>Inicia sesión</h1>
        <p className="auth-intro">Accede a tus reservas y continúa tu viaje.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <p className="auth-footer"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link></p>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {resendMessage && <p className="success-message" role="status">{resendMessage}</p>}
          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <button className="button button-outline button-full" disabled={resending || !email} onClick={resendConfirmation}>
          {resending ? 'Reenviando...' : 'Reenviar confirmación de correo'}
        </button>
        <p className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}
