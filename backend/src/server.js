import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

let server;

async function startServer() {
  await connectDatabase();
  server = app.listen(env.PORT, () => logger.info(`BookShop API listening on port ${env.PORT}`));
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down BookShop API');
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await disconnectDatabase();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch(async (error) => {
  logger.fatal({ err: error }, 'BookShop API failed to start');
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
