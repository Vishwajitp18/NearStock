import { app } from './app';
import { config } from './config/env';
import { pool } from './config/db';
import { cache } from './config/redis';
import { logger } from './lib/logger';

const server = app.listen(config.port, () => {
  logger.info(`Hyperlocal Retail Inventory Backend running on http://localhost:${config.port}`);
  logger.info(`Interactive API Documentation: http://localhost:${config.port}/docs`);
  logger.info(`Environment: ${config.env}`);
});

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully terminating server...`);
  server.close(async () => {
    try {
      await pool.end();
      const rawRedis = cache.getRawClient();
      if (rawRedis) {
        rawRedis.disconnect();
      }
      logger.info('Cleaned up database pools and redis connections. Bye!');
      process.exit(0);
    } catch (e: any) {
      logger.error(`Error during graceful shutdown: ${e.message}`);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

