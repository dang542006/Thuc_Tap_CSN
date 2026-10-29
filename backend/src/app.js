import express from 'express';
import { uploadsDirectory } from './config/uploads.js';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { env } from './config/env.js';
import { AppError } from './utils/AppError.js';

export const app = express();
app.use('/uploads', express.static(uploadsDirectory, { fallthrough: false, immutable: true, maxAge: '1d' }));

app.disable('x-powered-by');
const allowedOrigins = new Set(env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS policy', 403, 'CORS_ORIGIN_DENIED'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'BookShop API is healthy', data: { status: 'ok' } });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);
