import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
export const bookImagesDirectory = path.resolve(configDirectory, '../../uploads/books');
export const uploadsDirectory = path.resolve(configDirectory, '../../uploads');
export const bookImageMaxBytes = 5 * 1024 * 1024;
