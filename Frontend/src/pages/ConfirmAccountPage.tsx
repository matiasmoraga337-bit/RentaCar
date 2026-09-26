import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { apiRequest } from '../services/api';

export function ConfirmAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Confirmando tu correo...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<{ message: string }>(`/auth/confirmar-cuenta?token=${encodeURIComponent(token)}`)
      .then((result) => setMessage(result.message))
      .catch((requestError: Error) => {
        setError(requestError.message);
        setMessage('');
      });
  }, [token]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">CUENTA RENTACAR</span>
        <h1>{error || !token ? 'No pudimos confirmar tu cuenta' : 'Correo confirmado'}</h1>
        {!token && <p className="form-error" role="alert">El enlace de confirmación no contiene un token válido.</p>}
        {message && token && <p className="success-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Link className="button button-primary button-full" to="/login">Ir a iniciar sesión</Link>
      </section>
    </main>
  );
}
