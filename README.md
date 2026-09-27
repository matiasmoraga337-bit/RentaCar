# RentaCar

Marketplace multi-proveedor para reservar, pagar y gestionar arriendos de vehiculos.
Clientes, empresas de rent a car, personas naturales y administradores comparten una plataforma con pagos simulados, resenas moderadas, reportes y auditoria.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- SQL Server 2022+ (via Docker Desktop o instancia local).
- Mailpit (via Docker) para recibir el correo de confirmacion.

## Instalacion local

1. Instala dependencias:

   ```bash
   npm install
   npm --prefix Backend install
   npm --prefix Frontend install
   ```

2. Copia `.env.example` como `.env` y completa las variables de SQL Server y JWT.

3. Levanta SQL Server y Mailpit (opcional si ya tienes SQL Server local):

   ```bash
   docker compose up -d
   ```

   Mailpit queda disponible en `http://localhost:8025` y recibe SMTP en `localhost:1025`.

4. Crea la base de datos y aplica las migraciones:

   ```bash
   npm run db:setup
   ```

   Para recrearla desde cero (borra todo):

   ```bash
   npm run db:setup -- --fresh
   ```

5. Carga los datos de demostracion (admin, clientes, proveedores, sedes, vehiculos, reservas y arriendos historicos):

   ```bash
   npm run db:seed
   ```

6. Levanta backend y frontend en terminales separadas:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

   API: `http://localhost:3000`
   Frontend: `http://localhost:5173`

## Usuarios de demostracion

Todos los usuarios demo usan la contrasena `DemoSeed123!`, salvo el admin:

| Rol      | Correo                       | Contrasena    |
| -------- | ---------------------------- | ------------- |
| Admin    | `adminprueba@rentacar.cl`    | `PruebaAdmin123` |
| Cliente  | `cliente.demo1@rentacar.cl` a `cliente.demo8@rentacar.cl` | `DemoSeed123!` |
| Proveedor| `proveedor.demo1@rentacar.cl` a `proveedor.demo4@rentacar.cl` | `DemoSeed123!` |

El primer login de cada cuenta requiere confirmar el correo desde Mailpit.

## Scripts disponibles

| Comando                  | Descripcion                                            |
| ------------------------ | ------------------------------------------------------ |
| `npm run dev:backend`    | Backend Express en `:3000` con recarga (tsx).          |
| `npm run dev:frontend`   | Frontend React + Vite en `:5173`.                      |
| `npm run build:frontend` | Build de produccion del frontend.                      |
| `npm run build:backend`  | Compilacion TypeScript del backend.                    |
| `npm run db:setup`       | Crea `RentaCarDB` (esquema + migraciones).             |
| `npm run db:setup -- --fresh` | Recrea la base desde cero.                        |
| `npm run db:seed`        | Carga datos de demostracion.                           |
| `npm run test:e2e:local` | E2E local (auth, flujos, admin). Requiere backend y Mailpit. |
| `npm run test:qa:local`  | QA de flujos y de base de datos (cursor, tipos de proveedor). |

## Variable de entorno

Las variables esperadas estan documentadas en `.env.example`:

- `MSSQL_SA_PASSWORD`: clave del contenedor SQL Server.
- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: conexion del backend.
- `PORT`: puerto de la API.
- `CORS_ORIGIN`: origen permitido para el frontend.
- `JWT_SECRET`: secreto local para JWT.
- `ACCESS_TOKEN_TTL`: vida del access token (default `2h`).
- `REFRESH_TOKEN_TTL_DAYS`: vida y rotacion del refresh token (default `30`).
- `FRONTEND_URL`: origen usado en enlaces de confirmacion.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: correo saliente (para local: Mailpit en `localhost:1025`).

## Verificacion

```bash
npm run build:backend
npm --prefix Frontend run lint
npm run build:frontend
npm run test:e2e:local
npm run test:qa:local
```

Las suites E2E/QA requieren el backend levantado, SQL Server con datos demo y Mailpit disponible. Crean usuarios temporales, confirman su correo desde la bandeja de Mailpit y validan login y reutilizacion del token.

Las sesiones usan un refresh token opaco rotado en cada renovacion: un refresh reutilizado o revocado es rechazado (`401`), el logout lo revoca en el servidor y restablecer la contrasena revoca todas las sesiones del usuario.

## Flujo de demo

1. Registrar una cuenta.
2. Abrir el correo de confirmacion en Mailpit.
3. Confirmar la cuenta e iniciar sesion.
4. Registrar proveedor, sede y vehiculo.
5. Aprobar proveedor y publicar vehiculo desde Admin.
6. Reservar y completar el checkout Webpay simulado.
7. Iniciar y finalizar el arriendo desde Operaciones.
8. Publicar una resena desde el perfil del cliente.

## Documentacion

- `docs/API.md`: endpoints de la API REST.
- `docs/MODELO_RELACIONAL.md`: modelo relacional, vistas, procedimientos y triggers.
- `docs/CHECKLIST_REVISION_MANUAL.md`: checklist para probar la interfaz en el navegador.
- `RentaCar_IMAGEN_ModeloRelacional.png`: diagrama relacional.
- `DESIGN.md`: diseno del sistema.
- `ESPECIFICACION_PROYECTO.md`: especificacion del proyecto.
- `PLANNING.md`: estado de las fases del proyecto.