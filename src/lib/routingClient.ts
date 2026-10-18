import axios from 'axios';
import { cache } from '../config/redis';
import { config } from '../config/env';
import { logger } from './logger';
import { toGeohash, estimateEtaSeconds } from './geo';

export interface DestinationPoint {
  shopId: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export interface EtaResult {
  shopId: string;
  distanceMeters: number;
  durationSeconds: number;
  etaEstimated: boolean;
}

export async function calculateBatchEta(
  origin: { lat: number; lng: number },
  destinations: DestinationPoint[]
): Promise<Map<string, EtaResult>> {
  const results = new Map<string, EtaResult>();
  if (destinations.length === 0) return results;

  const originGeohash = toGeohash(origin.lat, origin.lng, 7);
  const uncached: DestinationPoint[] = [];

  // Step 1: Check Redis cache
  for (const dest of destinations) {
    const cacheKey = `eta:${originGeohash}:${dest.shopId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        results.set(dest.shopId, {
          shopId: dest.shopId,
          distanceMeters: parsed.distanceMeters,
          durationSeconds: parsed.durationSeconds,
          etaEstimated: false,
        });
        continue;
      } catch (e) {
        // invalid cache, proceed to fetch
      }
    }
    uncached.push(dest);
  }

  if (uncached.length === 0) {
    return results;
  }

  // Step 2: Try external routing provider if configured
  let externalSuccess = false;

  if (config.routing.provider === 'osrm' && config.routing.osrmUrl) {
    try {
      // OSRM Table Service: /table/v1/driving/{coordinates}?sources=0
      // Format: {lng},{lat};{dest1_lng},{dest1_lat};...
      const coords = [`${origin.lng},${origin.lat}`];
      for (const dest of uncached) {
        coords.push(`${dest.lng},${dest.lat}`);
      }
      const coordsStr = coords.join(';');
      const url = `${config.routing.osrmUrl}/table/v1/driving/${coordsStr}?sources=0&annotations=duration,distance`;

      const response = await axios.get(url, { timeout: 2500 });
      if (response.data && response.data.durations && response.data.durations[0]) {
        const durations = response.data.durations[0];
        const distances = response.data.distances ? response.data.distances[0] : null;

        for (let i = 0; i < uncached.length; i++) {
          const dest = uncached[i];
          const duration = Math.round(durations[i + 1] ?? estimateEtaSeconds(dest.distanceMeters));
          const distance = distances && distances[i + 1] ? Math.round(distances[i + 1]) : dest.distanceMeters;

          const etaData = {
            shopId: dest.shopId,
            distanceMeters: distance,
            durationSeconds: duration,
            etaEstimated: false,
          };
          results.set(dest.shopId, etaData);

          // Cache in Redis for 10 minutes (600s)
          const cacheKey = `eta:${originGeohash}:${dest.shopId}`;
          await cache.setex(cacheKey, 600, JSON.stringify(etaData));
        }
        externalSuccess = true;
      }
    } catch (err: any) {
      logger.debug(`OSRM routing call unavailable: ${err.message}. Using fallback road speed model.`);
    }
  }

  // Step 3: Fallback estimation if external provider failed or wasn't used
  if (!externalSuccess) {
    for (const dest of uncached) {
      const estimatedSeconds = estimateEtaSeconds(dest.distanceMeters);
      const etaData: EtaResult = {
        shopId: dest.shopId,
        distanceMeters: Math.round(dest.distanceMeters * 1.3),
        durationSeconds: estimatedSeconds,
        etaEstimated: true,
      };
      results.set(dest.shopId, etaData);

      // Cache fallback for 5 minutes (300s)
      const cacheKey = `eta:${originGeohash}:${dest.shopId}`;
      await cache.setex(cacheKey, 300, JSON.stringify(etaData));
    }
  }

  return results;
}

