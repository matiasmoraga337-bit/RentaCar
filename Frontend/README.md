# RentaCar - Frontend

Aplicacion React + TypeScript + Vite del marketplace multi-proveedor de
arriendo de vehiculos.

## Requisitos

- Node.js 22 o superior.
- Backend RentaCar levantado en `http://localhost:3000` (ver README raiz).

## Desarrollo

```bash
npm install
npm run dev
```

Frontend disponible en `http://localhost:5173`. La direccion de la API se
configura con `CORS_ORIGIN` y `FRONTEND_URL` en el `.env` de la raiz del
proyecto.

## Build y lint

```bash
npm run lint
npm run build
```

## Estructura

- `src/services/api.ts`: cliente de la API (base URL y autenticacion).
- `src/context/`: contexto de sesion (`AuthContext`).
- `src/pages/`: paginas de la aplicacion (catalogo, reservas, pagos, arriendos, admin, proveedor).
- `src/components/`: componentes de UI reutilizables.