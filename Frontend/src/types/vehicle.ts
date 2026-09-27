export interface Vehicle {
  ID_vehiculo: number;
  precio_diario_base_vehiculo: number;
  nombre_comercial_proveedor: string;
  nombre_marca: string;
  nombre_modelo: string;
  nombre_tipo_vehiculo: string;
  nombre_comuna?: string | null;
  nombre_region?: string | null;
  url_foto_principal?: string | null;
}

export interface VehiclePhoto {
  ID_foto_vehiculo: number;
  url_foto_vehiculo: string;
  es_principal_foto: boolean;
}