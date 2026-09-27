import { closeSync, mkdirSync, openSync, readSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { Request, Response } from 'express';

import { HttpError } from '../utils/http-error.js';

const vehiculosDir = fileURLToPath(new URL('../../uploads/vehiculos', import.meta.url));

export const uploadsDir = vehiculosDir;
export const uploadsUrlPrefix = '/uploads/vehiculos';
export const MAX_PHOTO_COUNT = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function assetHttpPath(filename: string): string {
  return `${uploadsUrlPrefix}/${filename}`;
}

export function isPngSignature(buffer: Buffer): boolean {
  return buffer.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.equals(buffer.subarray(0, PNG_SIGNATURE.length));
}

function isLikelyPngFile(filePath: string): boolean {
  const fd = openSync(filePath, 'r');
  try {
    const signature = Buffer.alloc(PNG_SIGNATURE.length);
    readSync(fd, signature, 0, signature.length, 0);
    return isPngSignature(signature);
  } finally {
    closeSync(fd);
  }
}

const vehiclePhotoStorage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    mkdirSync(vehiculosDir, { recursive: true });
    callback(null, vehiculosDir);
  },
  filename: (_request, _file, callback) => {
    const name = `${Date.now()}-${randomUUID().slice(0, 8)}.png`;
    callback(null, name);
  },
});

const photoUpload = multer({
  storage: vehiclePhotoStorage,
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTO_COUNT },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype !== 'image/png') {
      callback(new HttpError(400, 'Solo se permiten imagenes PNG.'));
      return;
    }
    callback(null, true);
  },
});

export function uploadVehiclePhotos(request: Request, response: Response): Promise<Express.Multer.File[]> {
  return new Promise((resolve, reject) => {
    photoUpload.array('fotos', MAX_PHOTO_COUNT)(request, response, (error: unknown) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          const messages: Record<string, string> = {
            LIMIT_FILE_SIZE: `Cada foto debe pesar maximo ${MAX_PHOTO_BYTES / (1024 * 1024)} MB.`,
            LIMIT_FILE_COUNT: `Maximo ${MAX_PHOTO_COUNT} fotos por vehiculo.`,
            LIMIT_UNEXPECTED_FILE: 'Campo de archivo no valido.',
          };
          reject(new HttpError(400, messages[error.code] ?? 'No se pudieron subir las fotos.'));
          return;
        }
        reject(error);
        return;
      }

      const files = request.files as Express.Multer.File[];
      resolve(Array.isArray(files) ? files : []);
    });
  });
}

export function removeUploadedFiles(files: Express.Multer.File[]): void {
  for (const file of files) {
    try {
      unlinkSync(file.path);
    } catch {
      // el archivo puede no existir; se ignora
    }
  }
}

export function removeFileByUrl(url: string): void {
  const filename = url.split('/').pop();
  if (!filename) return;

  try {
    unlinkSync(path.join(vehiculosDir, filename));
  } catch {
    // el archivo fisico puede no existir; se ignora
  }
}

export function discardInvalidPngFiles(files: Express.Multer.File[]): Express.Multer.File[] {
  const valid: Express.Multer.File[] = [];
  const invalid: Express.Multer.File[] = [];

  for (const file of files) {
    try {
      if (isLikelyPngFile(file.path)) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    } catch {
      invalid.push(file);
    }
  }

  removeUploadedFiles(invalid);
  return valid;
}