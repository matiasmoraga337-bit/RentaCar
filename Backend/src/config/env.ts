import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
});

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: requiredEnv('JWT_SECRET'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'no-reply@rentacar.local',
  },
  database: {
    server: requiredEnv('DB_SERVER'),
    port: Number(process.env.DB_PORT ?? 1433),
    database: requiredEnv('DB_NAME'),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
  },
};
