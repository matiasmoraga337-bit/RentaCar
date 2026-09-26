import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { apiRequest } from '../services/api';

export function SimulatedPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function resolvePayment(aprobado: boolean) {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError('Token de pago inválido.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await apiRequest<{ status: string }>(`/pagos/simulados/${token}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({ aprobado }),
      });
      setResult(response.status === 'APROBADA' ? 'Pago aprobado correctamente.' : 'Pago rechazado.');
      if (response.status === 'APROBADA') setTimeout(() => navigate('/perfil'), 900);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible procesar el pago.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">WEBPAY SIMULADO</span>
        <h1>Confirma tu pago</h1>
        <p className="auth-intro">Este checkout es una simulación local. No ingreses datos reales de tarjeta.</p>
        <div className="payment-simulation-box">
          <strong>Transacción segura de prueba</strong>
          <span>Token: {token ? `${token.slice(0, 8)}…` : 'inválido'}</span>
        </div>
        {result && <p className="success-message" role="status">{result}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="payment-actions">
          <button className="button button-primary button-full" disabled={submitting} onClick={() => resolvePayment(true)}>Aprobar pago</button>
          <button className="button button-outline button-full" disabled={submitting} onClick={() => resolvePayment(false)}>Rechazar pago</button>
        </div>
        <Link className="auth-footer" to="/vehiculos">Volver al catálogo</Link>
      </section>
    </main>
  );
}
