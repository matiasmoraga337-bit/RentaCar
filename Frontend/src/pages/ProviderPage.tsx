import { useEffect, useState } from 'react';

import { apiRequest } from '../services/api';

interface Provider {
  ID_proveedor: number;
  nombre_comercial_proveedor: string;
  razon_social_proveedor?: string | null;
  rut_proveedor?: string | null;
  nombre_estado_proveedor: string;
  es_administrador_proveedor_usuario: boolean;
}

interface Catalogs {
  types: { ID_tipo_vehiculo: number; nombre_tipo_vehiculo: string }[];
  models: { ID_modelo: number; nombre_modelo: string }[];
  fuels: { ID_tipo_combustible: number; nombre_tipo_combustible: string }[];
  transmissions: { ID_tipo_transmision: number; nombre_tipo_transmision: string }[];
  communes: { ID_comuna: number; nombre_comuna: string }[];
}

interface Branch {
  ID_sede_proveedor: number;
  nombre_sede_proveedor: string;
  direccion_sede_proveedor: string;
}

interface ProviderVehicle {
  ID_vehiculo: number;
  patente_vehiculo: string;
  nombre_marca: string;
  nombre_modelo: string;
  precio_diario_base_vehiculo: number;
  nombre_estado_publicacion_vehiculo: string;
}

function fetchProviders() {
  return apiRequest<Provider[]>('/proveedores/me');
}

export function ProviderPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<ProviderVehicle[]>([]);
  const [form, setForm] = useState({
    tipo: 'EMPRESA',
    nombreComercial: '',
    razonSocial: '',
    rutProveedor: '',
    telefono: '',
    email: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [vehicleMessage, setVehicleMessage] = useState('');
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const [branchMessage, setBranchMessage] = useState('');
  const [branchForm, setBranchForm] = useState({ idComuna: '', nombre: '', direccion: '' });
  const [vehicleForm, setVehicleForm] = useState({
    idSedeActual: '',
    idModelo: '',
    idTipoVehiculo: '',
    idTipoCombustible: '',
    idTipoTransmision: '',
    patente: '',
    vin: '',
    anio: '',
    kilometraje: '0',
    precioDiario: '',
  });

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch((requestError: Error) => console.error(requestError));
  }, []);

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    Promise.all([
      apiRequest<Branch[]>(`/proveedores/${selectedProvider}/sedes`),
      apiRequest<ProviderVehicle[]>(`/proveedores/${selectedProvider}/vehiculos`),
      apiRequest<Catalogs>('/catalogos/vehiculos'),
    ])
      .then(([branchResult, vehicleResult, catalogResult]) => {
        setBranches(branchResult);
        setVehicles(vehicleResult);
        setCatalogs(catalogResult);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [selectedProvider]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVehicleField(field: keyof typeof vehicleForm, value: string) {
    setVehicleForm((current) => ({ ...current, [field]: value }));
  }

  function updateBranchField(field: keyof typeof branchForm, value: string) {
    setBranchForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      await apiRequest('/proveedores', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMessage('Proveedor registrado y enviado a revisión.');
      setForm({ tipo: 'EMPRESA', nombreComercial: '', razonSocial: '', rutProveedor: '', telefono: '', email: '' });
      setProviders(await fetchProviders());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible registrar el proveedor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVehicleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProvider) return;

    setVehicleSubmitting(true);
    setVehicleMessage('');
    setError('');

    try {
      await apiRequest(`/proveedores/${selectedProvider}/vehiculos`, {
        method: 'POST',
        body: JSON.stringify({
          idSedeActual: Number(vehicleForm.idSedeActual),
          idModelo: Number(vehicleForm.idModelo),
          idTipoVehiculo: Number(vehicleForm.idTipoVehiculo),
          idTipoCombustible: Number(vehicleForm.idTipoCombustible),
          idTipoTransmision: Number(vehicleForm.idTipoTransmision),
          patente: vehicleForm.patente,
          vin: vehicleForm.vin,
          anio: Number(vehicleForm.anio),
          kilometraje: Number(vehicleForm.kilometraje),
          precioDiario: Number(vehicleForm.precioDiario),
        }),
      });
      setVehicleMessage('Vehículo registrado correctamente. Quedará pendiente de publicación.');
      setVehicles(await apiRequest<ProviderVehicle[]>(`/proveedores/${selectedProvider}/vehiculos`));
      setVehicleForm((current) => ({
        ...current,
        patente: '',
        vin: '',
        anio: '',
        kilometraje: '0',
        precioDiario: '',
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible registrar el vehículo.');
    } finally {
      setVehicleSubmitting(false);
    }
  }

  async function handleBranchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProvider) return;

    setBranchSubmitting(true);
    setBranchMessage('');
    setError('');

    try {
      await apiRequest(`/proveedores/${selectedProvider}/sedes`, {
        method: 'POST',
        body: JSON.stringify({
          idComuna: Number(branchForm.idComuna),
          nombre: branchForm.nombre,
          direccion: branchForm.direccion,
        }),
      });
      setBranches(await apiRequest<Branch[]>(`/proveedores/${selectedProvider}/sedes`));
      setBranchForm({ idComuna: '', nombre: '', direccion: '' });
      setBranchMessage('Sede registrada correctamente.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible registrar la sede.');
    } finally {
      setBranchSubmitting(false);
    }
  }

  return (
    <main className="provider-page">
      <section className="profile-header">
        <div>
          <span className="eyebrow">ESPACIO DEL PROVEEDOR</span>
          <h1>Publica tu flota.</h1>
          <p>Registra tu proveedor para comenzar a gestionar vehículos y sedes.</p>
        </div>
      </section>

      <section className="provider-layout">
        <article className="provider-form-card">
          <span className="eyebrow">NUEVO PROVEEDOR</span>
          <h2>Datos principales</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Tipo de proveedor
              <select value={form.tipo} onChange={(event) => updateField('tipo', event.target.value)}>
                <option value="EMPRESA">Empresa</option>
                <option value="PERSONA">Persona natural</option>
              </select>
            </label>
            <label>
              Nombre comercial
              <input value={form.nombreComercial} onChange={(event) => updateField('nombreComercial', event.target.value)} required />
            </label>
            {form.tipo === 'EMPRESA' && (
              <>
                <label>
                  Razón social
                  <input value={form.razonSocial} onChange={(event) => updateField('razonSocial', event.target.value)} required />
                </label>
                <label>
                  RUT de empresa
                  <input value={form.rutProveedor} onChange={(event) => updateField('rutProveedor', event.target.value)} required />
                </label>
              </>
            )}
            <label>
              Teléfono
              <input value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
            </label>
            <label>
              Correo de contacto
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            {message && <p className="success-message" role="status">{message}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-full" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar proveedor'}
            </button>
          </form>
        </article>

        <section className="provider-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MIS PROVEEDORES</span>
              <h2>Espacios registrados</h2>
            </div>
            <span className="catalog-count">{providers.length}</span>
          </div>
          {providers.length === 0 ? (
            <div className="empty-state compact-empty">
              <span>✦</span>
              <p>Aún no tienes proveedores asociados.</p>
            </div>
          ) : providers.map((provider) => (
            <article className="provider-item" key={provider.ID_proveedor}>
              <div>
                <span className="vehicle-provider">{provider.nombre_estado_proveedor}</span>
                <h3>{provider.nombre_comercial_proveedor}</h3>
                <p>{provider.razon_social_proveedor ?? 'Proveedor persona natural'}</p>
              </div>
              <span className="provider-status">{provider.es_administrador_proveedor_usuario ? 'Administrador' : 'Colaborador'}</span>
            </article>
          ))}
        </section>
      </section>

      <section className="fleet-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTIÓN DE FLOTA</span>
            <h2>Registra tus vehículos</h2>
          </div>
          <select
            value={selectedProvider ?? ''}
            onChange={(event) => setSelectedProvider(Number(event.target.value) || null)}
            aria-label="Seleccionar proveedor"
          >
            <option value="">Selecciona un proveedor</option>
            {providers.map((provider) => (
              <option key={provider.ID_proveedor} value={provider.ID_proveedor}>
                {provider.nombre_comercial_proveedor}
              </option>
            ))}
          </select>
        </div>

        {selectedProvider && catalogs && (
          <div className="fleet-layout">
            <div className="fleet-forms">
              <form className="branch-form" onSubmit={handleBranchSubmit}>
                <h3>Nueva sede</h3>
                <label>
                  Comuna
                  <select value={branchForm.idComuna} onChange={(event) => updateBranchField('idComuna', event.target.value)} required>
                    <option value="">Selecciona una comuna</option>
                    {catalogs.communes.map((commune) => <option key={commune.ID_comuna} value={commune.ID_comuna}>{commune.nombre_comuna}</option>)}
                  </select>
                </label>
                <label>Nombre<input value={branchForm.nombre} onChange={(event) => updateBranchField('nombre', event.target.value)} required /></label>
                <label>Dirección<input value={branchForm.direccion} onChange={(event) => updateBranchField('direccion', event.target.value)} required /></label>
                {branchMessage && <p className="success-message" role="status">{branchMessage}</p>}
                <button className="button button-quiet button-full" disabled={branchSubmitting}>{branchSubmitting ? 'Registrando...' : 'Agregar sede'}</button>
              </form>

              <form className="vehicle-form" onSubmit={handleVehicleSubmit}>
              <label>
                Sede actual
                <select value={vehicleForm.idSedeActual} onChange={(event) => updateVehicleField('idSedeActual', event.target.value)} required>
                  <option value="">Selecciona una sede</option>
                  {branches.map((branch) => (
                    <option key={branch.ID_sede_proveedor} value={branch.ID_sede_proveedor}>{branch.nombre_sede_proveedor}</option>
                  ))}
                </select>
              </label>
              <label>
                Modelo
                <select value={vehicleForm.idModelo} onChange={(event) => updateVehicleField('idModelo', event.target.value)} required>
                  <option value="">Selecciona un modelo</option>
                  {catalogs.models.map((model) => <option key={model.ID_modelo} value={model.ID_modelo}>{model.nombre_modelo}</option>)}
                </select>
              </label>
              <label>
                Tipo de vehículo
                <select value={vehicleForm.idTipoVehiculo} onChange={(event) => updateVehicleField('idTipoVehiculo', event.target.value)} required>
                  <option value="">Selecciona un tipo</option>
                  {catalogs.types.map((type) => <option key={type.ID_tipo_vehiculo} value={type.ID_tipo_vehiculo}>{type.nombre_tipo_vehiculo}</option>)}
                </select>
              </label>
              <label>
                Combustible
                <select value={vehicleForm.idTipoCombustible} onChange={(event) => updateVehicleField('idTipoCombustible', event.target.value)} required>
                  <option value="">Selecciona combustible</option>
                  {catalogs.fuels.map((fuel) => <option key={fuel.ID_tipo_combustible} value={fuel.ID_tipo_combustible}>{fuel.nombre_tipo_combustible}</option>)}
                </select>
              </label>
              <label>
                Transmisión
                <select value={vehicleForm.idTipoTransmision} onChange={(event) => updateVehicleField('idTipoTransmision', event.target.value)} required>
                  <option value="">Selecciona transmisión</option>
                  {catalogs.transmissions.map((transmission) => <option key={transmission.ID_tipo_transmision} value={transmission.ID_tipo_transmision}>{transmission.nombre_tipo_transmision}</option>)}
                </select>
              </label>
              <label>Patente<input value={vehicleForm.patente} onChange={(event) => updateVehicleField('patente', event.target.value)} required /></label>
              <label>VIN<input value={vehicleForm.vin} onChange={(event) => updateVehicleField('vin', event.target.value)} maxLength={17} required /></label>
              <label>Año<input type="number" value={vehicleForm.anio} onChange={(event) => updateVehicleField('anio', event.target.value)} min="1950" max="2100" required /></label>
              <label>Kilometraje<input type="number" value={vehicleForm.kilometraje} onChange={(event) => updateVehicleField('kilometraje', event.target.value)} min="0" required /></label>
              <label>Precio diario<input type="number" value={vehicleForm.precioDiario} onChange={(event) => updateVehicleField('precioDiario', event.target.value)} min="1" required /></label>
              {vehicleMessage && <p className="success-message" role="status">{vehicleMessage}</p>}
              <button className="button button-primary button-full" disabled={vehicleSubmitting}>{vehicleSubmitting ? 'Registrando...' : 'Registrar vehículo'}</button>
            </form>

              </div>
            <div className="fleet-list">
              <h3>Vehículos registrados</h3>
              {vehicles.length === 0 ? <p className="empty-copy">Aún no hay vehículos para este proveedor.</p> : vehicles.map((vehicle) => (
                <article className="fleet-item" key={vehicle.ID_vehiculo}>
                  <div><strong>{vehicle.nombre_marca} {vehicle.nombre_modelo}</strong><p>{vehicle.patente_vehiculo} · ${Number(vehicle.precio_diario_base_vehiculo).toLocaleString('es-CL')} diarios</p></div>
                  <span>{vehicle.nombre_estado_publicacion_vehiculo}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
