import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { getDatabasePool } from './database/sql.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import providersRouter from './routes/providers.js';
import vehiclesRouter from './routes/vehicles.js';
import catalogsRouter from './routes/catalogs.js';
import paymentsRouter from './routes/payments.js';
import reservationsRouter from './routes/reservations.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/proveedores', providersRouter);
app.use('/api/vehiculos', vehiclesRouter);
app.use('/api/catalogos', catalogsRouter);
app.use('/api/reservas', reservationsRouter);
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

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ message: 'Error interno del servidor.' });
});

app.listen(env.port, () => {
  console.log(`RentaCar API escuchando en http://localhost:${env.port}`);
});
