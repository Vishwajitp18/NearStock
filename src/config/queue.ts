import { Queue } from 'bullmq';
import { config } from './env';
import { logger } from '../lib/logger';
import Redis from 'ioredis';

let connection: Redis | null = null;
let queueEnabled = false;

try {
  connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: () => null, // don't hang if offline
  });
  connection.on('ready', () => {
    queueEnabled = true;
    logger.info('BullMQ Redis connection ready');
  });
  connection.on('error', (err) => {
    queueEnabled = false;
    logger.warn(`BullMQ Redis error: ${err.message}. Running jobs locally.`);
  });
} catch (err: any) {
  logger.warn(`Failed to init BullMQ connection: ${err.message}`);
}

export const stockQueue = connection
  ? new Queue('stock-events', { connection, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 200 } })
  : null;

export const alertQueue = connection
  ? new Queue('alert-events', { connection, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 200 } })
  : null;

export const analyticsQueue = connection
  ? new Queue('analytics-events', { connection, defaultJobOptions: { removeOnComplete: 100, removeOnFail: 200 } })
  : null;

export async function publishEvent(eventName: string, data: any): Promise<void> {
  try {
    if (queueEnabled && stockQueue && alertQueue && analyticsQueue) {
      if (eventName.startsWith('stock.')) {
        await stockQueue.add(eventName, data);
      } else if (eventName.startsWith('alert.') || eventName === 'stock.low') {
        await alertQueue.add(eventName, data);
      } else {
        await analyticsQueue.add(eventName, data);
      }
      return;
    }
  } catch (err: any) {
    logger.warn(`Failed to push job to BullMQ (${eventName}): ${err.message}. Handling fallback.`);
  }

  // Fallback: handle in-process asynchronously
  setTimeout(async () => {
    try {
      const { handleLocalEvent } = await import('../workers/localWorker');
      await handleLocalEvent(eventName, data);
    } catch (fallbackErr: any) {
      logger.error(`Error in local event fallback: ${fallbackErr.message}`);
    }
  }, 0);
}

