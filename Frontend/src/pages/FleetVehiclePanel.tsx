import { useEffect, useState } from 'react';

import { apiRequest } from '../services/api';

interface Branch {
  ID_sede_proveedor: number;
  nombre_sede_proveedor: string;
  direccion_sede_proveedor: string;
}

interface VehicleBranch {
  ID_sede_proveedor: number;
  nombre_sede_proveedor: string;
  direccion_sede_proveedor: string;
  disponible_para_entrega: boolean;
  disponible_para_devolucion: boolean;
  es_actual: number;
}

interface Movement {
  ID_movimiento_vehiculo: number;
  fecha_movimiento_vehiculo: string;
  observacion_movimiento_vehiculo: string | null;
  sede_origen: string | null;
  sede_destino: string | null;
}

interface Props {
  providerId: number;
  vehicle: { ID_vehiculo: number; patente_vehiculo: string; nombre_marca: string; nombre_modelo: string };
  branches: Branch[];
}

export function FleetVehiclePanel({ providerId, vehicle, branches }: Props) {
  const [vehicleBranches, setVehicleBranches] = useState<VehicleBranch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [newSede, setNewSede] = useState('');
  const [delivery, setDelivery] = useState(true);
  const [returns, setReturns] = useState(true);
  const [moveDest, setMoveDest] = useState('');
  const [observation, setObservation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([
      apiRequest<VehicleBranch[]>(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/sedes`),
      apiRequest<Movement[]>(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/movimientos`),
    ])
      .then(([branchResult, movementResult]) => {
        setVehicleBranches(branchResult);
        setMovements(movementResult);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }

  useEffect(load, [providerId, vehicle.ID_vehiculo]);

  const currentBranch = vehicleBranches.find((branch) => branch.es_actual === 1);
  const availableBranches = branches.filter(
    (branch) => !vehicleBranches.some((assigned) => assigned.ID_sede_proveedor === branch.ID_sede_proveedor),
  );
  const moveTargets = branches.filter(
    (branch) => branch.ID_sede_proveedor !== currentBranch?.ID_sede_proveedor,
  );

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSede) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/sedes`, {
        method: 'POST',
        body: JSON.stringify({
          idSede: Number(newSede),
          disponibleParaEntrega: delivery,
          disponibleParaDevolucion: returns,
        }),
      });
      setNewSede('');
      setMessage('Sede habilitada.');
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible habilitar la sede.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(sedeId: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/sedes/${sedeId}`, {
        method: 'DELETE',
      });
      setMessage('Sede removida.');
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible quitar la sede.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moveDest) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/movimiento`, {
        method: 'POST',
        body: JSON.stringify({ idSedeDestino: Number(moveDest), observacion: observation }),
      });
      setMoveDest('');
      setObservation('');
      setMessage('Vehículo trasladado.');
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible trasladar el vehículo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fleet-manager">
      <div className="fleet-manager-heading">
        <strong>Gestión de {vehicle.nombre_marca} {vehicle.nombre_modelo}</strong>
        <span className="reservation-plate">{vehicle.patente_vehiculo}</span>
      </div>

      <div className="fleet-manager-grid">
        <div>
          <h4>Sedes habilitadas</h4>
          {vehicleBranches.length === 0 ? (
            <p className="empty-copy">Sin sedes habilitadas.</p>
          ) : (
            <ul className="fleet-branch-list">
              {vehicleBranches.map((branch) => (
                <li key={branch.ID_sede_proveedor}>
                  <div>
                    <strong>{branch.nombre_sede_proveedor}</strong>
                    <span>
                      {branch.disponible_para_entrega ? 'Entrega' : '—'} · {branch.disponible_para_devolucion ? 'Devolución' : '—'}
                      {branch.es_actual === 1 ? ' · Sede actual' : ''}
                    </span>
                  </div>
                  {branch.es_actual !== 1 && (
                    <button className="button button-outline button-small" disabled={busy} onClick={() => handleRemove(branch.ID_sede_proveedor)}>Quitar</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="branch-form" onSubmit={handleAdd}>
            <h4>Habilitar sede</h4>
            <label>
              Sede
              <select value={newSede} onChange={(event) => setNewSede(event.target.value)} required>
                <option value="">Selecciona una sede</option>
                {availableBranches.map((branch) => (
                  <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>
                ))}
              </select>
            </label>
            <label className="fleet-check"><input type="checkbox" checked={delivery} onChange={(event) => setDelivery(event.target.checked)} /> Disponible para entrega</label>
            <label className="fleet-check"><input type="checkbox" checked={returns} onChange={(event) => setReturns(event.target.checked)} /> Disponible para devolución</label>
            <button className="button button-quiet button-full" disabled={busy || !newSede}>Habilitar sede</button>
          </form>
        </div>

        <div>
          <h4>Trasladar de sede</h4>
          <p className="empty-copy">Sede actual: {currentBranch ? currentBranch.nombre_sede_proveedor : 'sin asignar'}</p>
          <form className="branch-form" onSubmit={handleMove}>
            <label>
              Sede destino
              <select value={moveDest} onChange={(event) => setMoveDest(event.target.value)} required>
                <option value="">Selecciona una sede</option>
                {moveTargets.map((branch) => (
                  <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>
                ))}
              </select>
            </label>
            <label>Observación<input value={observation} onChange={(event) => setObservation(event.target.value)} /></label>
            <button className="button button-primary button-full" disabled={busy || !moveDest}>Trasladar</button>
          </form>

          <h4>Historial de movimientos</h4>
          {movements.length === 0 ? (
            <p className="empty-copy">Sin movimientos registrados.</p>
          ) : (
            <ul className="movement-list">
              {movements.map((movement) => (
                <li key={movement.ID_movimiento_vehiculo}>
                  <span>{new Date(movement.fecha_movimiento_vehiculo).toLocaleString('es-CL')}</span>
                  <strong>{movement.sede_origen ?? '—'} → {movement.sede_destino ?? '—'}</strong>
                  {movement.observacion_movimiento_vehiculo && <em>{movement.observacion_movimiento_vehiculo}</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}