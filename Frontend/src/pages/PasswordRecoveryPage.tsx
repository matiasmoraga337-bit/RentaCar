import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { apiRequest } from '../services/api';

export function PasswordRecoveryPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = token
        ? await apiRequest<{ message: string }>('/auth/restablecer-contrasena', { method: 'POST', body: JSON.stringify({ token, password }) })
        : await apiRequest<{ message: string }>('/auth/solicitar-recuperacion', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible completar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">SEGURIDAD</span>
        <h1>{token ? 'Nueva contraseña' : 'Recuperar contraseña'}</h1>
        <p className="auth-intro">{token ? 'Elige una contraseña nueva para tu cuenta.' : 'Te enviaremos un enlace si la cuenta existe.'}</p>
        <form onSubmit={submit}>
          {!token && <label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
          {token && <label>Nueva contraseña<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
          {message && <p className="success-message" role="status">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={loading}>{loading ? 'Procesando...' : token ? 'Cambiar contraseña' : 'Enviar enlace'}</button>
        </form>
        <Link className="auth-footer" to="/login">Volver a iniciar sesión</Link>
      </section>
    </main>
  );
}
