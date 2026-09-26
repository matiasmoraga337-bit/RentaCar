# RentaCar

Marketplace multi-proveedor para reservar, pagar y gestionar arriendos de vehiculos.

## Requisitos

- Node.js 22 o superior.
- npm 10 o superior.
- Docker Desktop.

## Instalacion local

1. Instala dependencias:

   ```bash
   npm install
   npm --prefix Backend install
   npm --prefix Frontend install
   ```

2. Copia `.env.example` como `.env` y completa las variables de SQL Server y JWT.

3. Levanta SQL Server y Mailpit:

   ```bash
   docker compose up -d
   ```

   Mailpit queda disponible en `http://localhost:8025` y recibe SMTP en `localhost:1025`.

4. Ejecuta `RentaCarDB.sql` en la base `RentaCarDB` y luego las migraciones de `migrations/` en orden.

5. Levanta backend y frontend en terminales separadas:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

   API: `http://localhost:3000`
   Frontend: `http://localhost:5173`

## Variables de entorno

Las variables esperadas están documentadas en `.env.example`:

- `MSSQL_SA_PASSWORD`: clave del contenedor SQL Server.
- `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: conexión del backend.
- `PORT`: puerto de la API.
- `CORS_ORIGIN`: origen permitido para el frontend.
- `JWT_SECRET`: secreto local para JWT.
- `FRONTEND_URL`: origen usado en enlaces de confirmación.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: correo saliente.

## Verificacion

```bash
npm --prefix Backend run build
npm --prefix Frontend run lint
npm --prefix Frontend run build
npm run test:e2e:local
```

El E2E local requiere el backend levantado y Mailpit disponible. Crea un usuario temporal, confirma su correo desde la bandeja de Mailpit y valida login y reutilizacion del token.

## Flujo de demo

1. Registrar una cuenta.
2. Abrir el correo de confirmacion en Mailpit.
3. Confirmar la cuenta e iniciar sesion.
4. Registrar proveedor, sede y vehiculo.
5. Aprobar proveedor y publicar vehiculo desde Admin.
6. Reservar y completar el checkout Webpay simulado.
7. Iniciar y finalizar el arriendo desde Operaciones.
8. Publicar una resena desde el perfil del cliente.

La documentacion de endpoints se encuentra en `docs/API.md`.
