import { useEffect, useState } from 'react';

import { apiRequest, apiUpload, assetUrl } from '../services/api';
import type { VehiclePhoto } from '../types/vehicle';

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

interface VehicleCatalogs {
  models: { ID_modelo: number; nombre_modelo: string }[];
  types: { ID_tipo_vehiculo: number; nombre_tipo_vehiculo: string }[];
  fuels: { ID_tipo_combustible: number; nombre_tipo_combustible: string }[];
  transmissions: { ID_tipo_transmision: number; nombre_tipo_transmision: string }[];
}

interface Props {
  providerId: number;
  vehicle: {
    ID_vehiculo: number;
    patente_vehiculo: string;
    nombre_marca: string;
    nombre_modelo: string;
    anio_vehiculo: number;
    kilometraje_vehiculo: number;
    precio_diario_base_vehiculo: number;
    nombre_estado_publicacion_vehiculo: string;
  };
  branches: Branch[];
  catalogs: VehicleCatalogs;
}

const MAX_PHOTO_COUNT = 10;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function FleetVehiclePanel({ providerId, vehicle, branches, catalogs }: Props) {
  const [vehicleBranches, setVehicleBranches] = useState<VehicleBranch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [newSede, setNewSede] = useState('');
  const [delivery, setDelivery] = useState(true);
  const [returns, setReturns] = useState(true);
  const [moveDest, setMoveDest] = useState('');
  const [observation, setObservation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    idModelo: '',
    idTipoVehiculo: '',
    idTipoCombustible: '',
    idTipoTransmision: '',
    anio: String(vehicle.anio_vehiculo ?? ''),
    kilometraje: String(vehicle.kilometraje_vehiculo ?? ''),
    precioDiario: String(vehicle.precio_diario_base_vehiculo ?? ''),
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState('');

  function load() {
    Promise.all([
      apiRequest<VehicleBranch[]>(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/sedes`),
      apiRequest<Movement[]>(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/movimientos`),
      apiRequest<VehiclePhoto[]>(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/fotos`),
    ])
      .then(([branchResult, movementResult, photoResult]) => {
        setVehicleBranches(branchResult);
        setMovements(movementResult);
        setPhotos(photoResult);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }

  useEffect(load, [providerId, vehicle.ID_vehiculo]);

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingPreviews]);

  function setPending(files: File[]) {
    setPendingFiles(files);
    setPendingPreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return files.map((file) => URL.createObjectURL(file));
    });
  }

  function handlePhotoFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const next = [...pendingFiles];

    for (const file of selected) {
      if (file.type !== 'image/png') {
        setError('Solo se permiten imagenes PNG.');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError('Cada foto debe pesar maximo 5 MB.');
        continue;
      }
      if (next.length + photos.length >= MAX_PHOTO_COUNT) {
        setError(`Maximo ${MAX_PHOTO_COUNT} fotos por vehiculo.`);
        break;
      }
      next.push(file);
    }

    setPending(next);
    event.target.value = '';
  }

  function removePendingPhoto(index: number) {
    setPending(pendingFiles.filter((_, photoIndex) => photoIndex !== index));
  }

  function updateEditField(field: keyof typeof editForm, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditBusy(true);
    setEditMessage('');
    setError('');

    const body: Record<string, number> = {};
    if (editForm.idModelo) body.idModelo = Number(editForm.idModelo);
    if (editForm.idTipoVehiculo) body.idTipoVehiculo = Number(editForm.idTipoVehiculo);
    if (editForm.idTipoCombustible) body.idTipoCombustible = Number(editForm.idTipoCombustible);
    if (editForm.idTipoTransmision) body.idTipoTransmision = Number(editForm.idTipoTransmision);
    if (editForm.anio) body.anio = Number(editForm.anio);
    if (editForm.kilometraje) body.kilometraje = Number(editForm.kilometraje);
    if (editForm.precioDiario) body.precioDiario = Number(editForm.precioDiario);

    if (Object.keys(body).length === 0) {
      setError('No hay campos que actualizar.');
      setEditBusy(false);
      return;
    }

    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const republished = vehicle.nombre_estado_publicacion_vehiculo === 'PUBLICADO'
        ? ' Como estaba publicado, quedará pendiente de republicación.' 
        : '';
      setEditMessage(`Vehículo actualizado.${republished}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible editar el vehículo.');
    } finally {
      setEditBusy(false);
    }
  }

  async function handlePhotosSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingFiles.length === 0) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      pendingFiles.forEach((file) => formData.append('fotos', file));
      await apiUpload<{ fotos: VehiclePhoto[] }>(
        `/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/fotos`,
        formData,
      );
      setMessage('Fotos subidas.');
      setPending([]);
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible subir las fotos.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPrincipal(photoId: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/fotos/${photoId}/principal`, {
        method: 'PATCH',
      });
      setMessage('Foto principal actualizada.');
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la foto principal.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePhoto(photoId: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/proveedores/${providerId}/vehiculos/${vehicle.ID_vehiculo}/fotos/${photoId}`, {
        method: 'DELETE',
      });
      setMessage('Foto eliminada.');
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible eliminar la foto.');
    } finally {
      setBusy(false);
    }
  }

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

      <form className="branch-form" onSubmit={handleEditSubmit}>
        <h4>Editar datos del vehículo</h4>
        <div className="fleet-edit-grid">
          <label>
            Modelo <small>(opcional)</small>
            <select value={editForm.idModelo} onChange={(event) => updateEditField('idModelo', event.target.value)}>
              <option value="">Sin cambio</option>
              {catalogs.models.map((model) => <option key={model.ID_modelo} value={model.ID_modelo}>{model.nombre_modelo}</option>)}
            </select>
          </label>
          <label>
            Tipo de vehículo <small>(opcional)</small>
            <select value={editForm.idTipoVehiculo} onChange={(event) => updateEditField('idTipoVehiculo', event.target.value)}>
              <option value="">Sin cambio</option>
              {catalogs.types.map((type) => <option key={type.ID_tipo_vehiculo} value={type.ID_tipo_vehiculo}>{type.nombre_tipo_vehiculo}</option>)}
            </select>
          </label>
          <label>
            Combustible <small>(opcional)</small>
            <select value={editForm.idTipoCombustible} onChange={(event) => updateEditField('idTipoCombustible', event.target.value)}>
              <option value="">Sin cambio</option>
              {catalogs.fuels.map((fuel) => <option key={fuel.ID_tipo_combustible} value={fuel.ID_tipo_combustible}>{fuel.nombre_tipo_combustible}</option>)}
            </select>
          </label>
          <label>
            Transmisión <small>(opcional)</small>
            <select value={editForm.idTipoTransmision} onChange={(event) => updateEditField('idTipoTransmision', event.target.value)}>
              <option value="">Sin cambio</option>
              {catalogs.transmissions.map((transmission) => <option key={transmission.ID_tipo_transmision} value={transmission.ID_tipo_transmision}>{transmission.nombre_tipo_transmision}</option>)}
            </select>
          </label>
        </div>
        <label>Año<input type="number" value={editForm.anio} onChange={(event) => updateEditField('anio', event.target.value)} min="1950" max="2100" /></label>
        <label>Kilometraje<input type="number" value={editForm.kilometraje} onChange={(event) => updateEditField('kilometraje', event.target.value)} min="0" /></label>
        <label>Precio diario<input type="number" value={editForm.precioDiario} onChange={(event) => updateEditField('precioDiario', event.target.value)} min="1" /></label>
        {editMessage && <p className="success-message" role="status">{editMessage}</p>}
        <button className="button button-quiet button-full" disabled={editBusy}>{editBusy ? 'Guardando...' : 'Guardar cambios'}</button>
      </form>

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

      <div className="fleet-photos">
        <h4>Fotos del vehículo</h4>
        {photos.length === 0 ? (
          <p className="empty-copy">Sin fotos todavía. La primera foto que subas será la principal.</p>
        ) : (
          <div className="fleet-photo-grid" role="group" aria-label="Fotos del vehículo">
            {photos.map((photo) => (
              <figure className="fleet-photo-item" key={photo.ID_foto_vehiculo}>
                <img src={assetUrl(photo.url_foto_vehiculo)} alt={`Foto ${photo.ID_foto_vehiculo}`} />
                <figcaption>
                  {photo.es_principal_foto && <span className="fleet-photo-flag">Principal</span>}
                  <div className="fleet-photo-actions">
                    {!photo.es_principal_foto && (
                      <button className="button button-outline button-small" disabled={busy} onClick={() => handleSetPrincipal(photo.ID_foto_vehiculo)}>Hacer principal</button>
                    )}
                    <button className="button button-outline button-small" disabled={busy} onClick={() => handleDeletePhoto(photo.ID_foto_vehiculo)}>Eliminar</button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {photos.length < MAX_PHOTO_COUNT && (
          <form className="branch-form" onSubmit={handlePhotosSubmit}>
            <h4>Subir fotos</h4>
            <label className="photo-field">
              Archivo(s) PNG <small>(máx. 5 MB cada una)</small>
              <input type="file" accept="image/png" multiple onChange={handlePhotoFiles} />
            </label>
            {pendingPreviews.length > 0 && (
              <div className="photo-preview-grid" role="group" aria-label="Fotos por subir">
                {pendingPreviews.map((url, index) => (
                  <div className="photo-preview-item" key={url}>
                    <img src={url} alt={`Foto ${index + 1}`} />
                    <button type="button" className="photo-remove" onClick={() => removePendingPhoto(index)} aria-label={`Quitar foto ${index + 1}`}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button className="button button-quiet button-full" disabled={busy || pendingFiles.length === 0}>
              {busy ? 'Subiendo...' : 'Subir fotos'}
            </button>
          </form>
        )}
      </div>

      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}