import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '../components/EmptyState';
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

interface VehicleResponse {
  items: Vehicle[];
  total: number;
}

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [commune, setCommune] = useState('');
  const [region, setRegion] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hasActiveFilters = Boolean(search || priceMax || commune || region || availableFrom || availableTo);

  function clearFilters() {
    setSearch('');
    setPriceMax('');
    setCommune('');
    setRegion('');
    setAvailableFrom('');
    setAvailableTo('');
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (search.trim()) params.set('search', search.trim());
    if (priceMax) params.set('priceMax', priceMax);
    if (commune.trim()) params.set('commune', commune.trim());
    if (region.trim()) params.set('region', region.trim());
    if (availableFrom) params.set('availableFrom', availableFrom);
    if (availableTo) params.set('availableTo', availableTo);

    apiRequest<VehicleResponse>(`/vehiculos?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((result) => setVehicles(result.items))
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [search, priceMax, commune, region, availableFrom, availableTo]);

  return (
    <main className="catalog-page">
      <section className="catalog-heading">
        <div>
          <span className="eyebrow">CATÁLOGO RentaCar</span>
          <h1>Elige cómo quieres moverte.</h1>
          <p>Explora vehículos publicados por proveedores independientes.</p>
        </div>
        <div className="catalog-count">{vehicles.length} vehículos</div>
      </section>

      <section className="filters-panel" aria-label="Filtros de vehículos">
        <label>
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Marca, modelo, tipo o comuna"
          />
        </label>
        <label>
          Precio diario máximo
          <input
            type="number"
            min="1"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder="Ej. 50000"
          />
        </label>
        <label>
          Comuna exacta
          <input value={commune} onChange={(event) => setCommune(event.target.value)} placeholder="Ej. Santiago" />
        </label>
        <label>
          Región exacta
          <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Ej. Region Metropolitana" />
        </label>
        <label>
          Disponible desde
          <input type="date" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} />
        </label>
        <label>
          Disponible hasta
          <input type="date" value={availableTo} onChange={(event) => setAvailableTo(event.target.value)} />
        </label>
        <div className="filter-actions">
          <button type="button" className="button button-outline button-small" onClick={clearFilters}>Limpiar filtros</button>
        </div>
      </section>

      {loading && <p className="catalog-message">Buscando vehículos...</p>}
      {error && <p className="form-error catalog-message" role="alert">{error}</p>}
      {!loading && !error && vehicles.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? 'Sin resultados' : 'Aún no hay vehículos publicados'}
          copy={hasActiveFilters ? 'Prueba con otros filtros o limpia la búsqueda.' : 'Cuando los proveedores publiquen su flota, aparecerá aquí.'}
        />
      )}
      {!loading && !error && vehicles.length > 0 && (
        <section className="vehicle-grid" aria-label="Vehículos publicados">
          {vehicles.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.ID_vehiculo}>
              <div className="vehicle-image" aria-hidden="true">
                <span>{vehicle.nombre_tipo_vehiculo}</span>
                <div className="mini-car" />
              </div>
              <div className="vehicle-content">
                <span className="vehicle-provider">{vehicle.nombre_comercial_proveedor}</span>
                <h2>{vehicle.nombre_marca} {vehicle.nombre_modelo}</h2>
                <p>{vehicle.nombre_comuna ?? 'Ubicación por confirmar'}, {vehicle.nombre_region ?? 'Chile'}</p>
                <div className="vehicle-footer">
                  <strong>${Number(vehicle.precio_diario_base_vehiculo).toLocaleString('es-CL')}</strong>
                  <span>por día</span>
                  <Link to={`/vehiculos/${vehicle.ID_vehiculo}`}>Ver detalle</Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
