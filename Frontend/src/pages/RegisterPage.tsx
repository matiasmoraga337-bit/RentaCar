import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    rut: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    password: '',
    telefono: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(form);
      navigate('/perfil');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page register-page">
      <section className="auth-card auth-card-wide">
        <span className="eyebrow">ÚNETE A RENTACAR</span>
        <h1>Crea tu cuenta</h1>
        <p className="auth-intro">Empieza a descubrir nuevas rutas y vehículos.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              RUT
              <input value={form.rut} onChange={(event) => updateField('rut', event.target.value)} required />
            </label>
            <label>
              Nombres
              <input value={form.nombres} onChange={(event) => updateField('nombres', event.target.value)} required />
            </label>
            <label>
              Apellido paterno
              <input value={form.apellidoPaterno} onChange={(event) => updateField('apellidoPaterno', event.target.value)} required />
            </label>
            <label>
              Apellido materno
              <input value={form.apellidoMaterno} onChange={(event) => updateField('apellidoMaterno', event.target.value)} />
            </label>
            <label>
              Correo electrónico
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Teléfono
              <input value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
            </label>
          </div>
          <label>
            Contraseña
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" minLength={8} required />
            <small>Usa al menos 8 caracteres.</small>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}
