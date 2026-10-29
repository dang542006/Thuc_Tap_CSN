import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  logger.info('Connected to MySQL through Prisma');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
