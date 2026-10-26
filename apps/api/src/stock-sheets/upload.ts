import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { diskStorage } from 'multer';
import { catchError, Observable, throwError } from 'rxjs';
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from './sheet-options';

/** Dossier des photos (servi en statique sous /uploads) */
export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf',
};

export const photoUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype] ?? ''}`),
  }),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype] && file.mimetype !== 'application/pdf') cb(null, true);
    else cb(new BadRequestException('Seules les images JPEG, PNG, WEBP ou HEIC sont acceptées.'), false);
  },
};

export function removeUploadedFiles(files: Express.Multer.File[]): void {
  for (const f of files) fs.rm(f.path, { force: true }, () => undefined);
}

/**
 * Supprime les photos déjà écrites sur disque si la requête échoue — y compris quand la validation
 * du DTO (ValidationPipe) rejette la fiche, ce qui se produit avant l'exécution du service.
 */
@Injectable()
export class CleanupUploadsOnErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError((err: unknown) => {
        const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
        removeUploadedFiles(files);
        return throwError(() => err);
      }),
    );
  }
}

/** Justificatifs (certificats de formation, habilitations) : une image ou un PDF, 10 Mo max */
export const documentUploadOptions: MulterOptions = {
  storage: photoUploadOptions.storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype] || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new BadRequestException('Seuls les fichiers PDF ou images sont acceptés.'), false);
  },
};

/** Supprime un fichier stocké dans uploads/ (ignore s'il n'existe plus) */
export function removeStoredFile(fileName: string | null | undefined): void {
  if (fileName) fs.rm(path.join(UPLOAD_DIR, fileName), { force: true }, () => undefined);
}

/** Photos d'une fiche de comptage : une par ligne (jusqu'à 300 lignes) */
export const countPhotoUploadOptions: MulterOptions = {
  ...photoUploadOptions,
  limits: { fileSize: MAX_PHOTO_BYTES, files: 300 },
};
