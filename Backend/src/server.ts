import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { uploadsDir } from './config/uploads.js';
import { getDatabasePool } from './database/sql.js';
import { HttpError } from './utils/http-error.js';
import { mapSqlBusinessError } from './utils/sql-errors.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import providersRouter from './routes/providers.js';
import vehiclesRouter from './routes/vehicles.js';
import catalogsRouter from './routes/catalogs.js';
import paymentsRouter from './routes/payments.js';
import reservationsRouter from './routes/reservations.js';
import rentalsRouter from './routes/rentals.js';

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' },
});

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use('/uploads/vehiculos', express.static(uploadsDir, { dotfiles: 'deny', index: false, fallthrough: true }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/proveedores', providersRouter);
app.use('/api/vehiculos', vehiclesRouter);
app.use('/api/catalogos', catalogsRouter);
app.use('/api/reservas', reservationsRouter);
app.use('/api/arriendos', rentalsRouter);
app.use('/api', paymentsRouter);

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'rentacar-backend',
  });
});

app.get('/api/health/db', async (_request, response, next) => {
  try {
    const pool = await getDatabasePool();
    const result = await pool.request().query(`
      SELECT DB_NAME() AS database_name;
    `);

    response.json({
      status: 'ok',
      database: result.recordset[0].database_name,
    });
  } catch (error) {
    next(error);
  }
});

app.use((_request: express.Request, response: express.Response) => {
  response.status(404).json({ message: 'Ruta no encontrada.' });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const bodyParseError = error as { type?: string } | null;
  if (bodyParseError?.type === 'entity.parse.failed') {
    response.status(400).json({ message: 'JSON invalido.' });
    return;
  }

  const businessError = mapSqlBusinessError(error);

  if (businessError) {
    response.status(businessError.status).json({ message: businessError.message });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ message: 'Error interno del servidor.' });
});

app.listen(env.port, () => {
  console.log(`RentaCar API escuchando en http://localhost:${env.port}`);
});
