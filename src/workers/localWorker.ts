import { query } from '../config/db';
import { cache } from '../config/redis';
import { logger } from '../lib/logger';

export async function handleLocalEvent(eventName: string, data: any): Promise<void> {
  logger.info(`Handling background event: ${eventName}`, { data });

  try {
    switch (eventName) {
      case 'stock.updated': {
        const { inventoryId, shopId, productId, quantity, threshold } = data;

        // 1. Invalidate hot search cache for this product
        if (productId) {
          await cache.invalidatePattern(`search:${productId}:*`);
        }

        // 2. Check if low stock threshold is reached
        if (typeof quantity === 'number' && typeof threshold === 'number' && quantity <= threshold) {
          await handleLocalEvent('stock.low', {
            shopId,
            productId,
            quantity,
            threshold,
          });
        }
        break;
      }

      case 'stock.low': {
        const { shopId, productId, quantity, threshold } = data;

        // Find shop owner and product details
        const shopRes = await query('SELECT owner_id, name FROM shops WHERE id = $1', [shopId]);
        const prodRes = await query('SELECT name FROM products WHERE id = $1', [productId]);

        if (shopRes.rows.length > 0) {
          const ownerId = shopRes.rows[0].owner_id;
          const shopName = shopRes.rows[0].name;
          const prodName = prodRes.rows.length > 0 ? prodRes.rows[0].name : 'Product';

          await query(
            `INSERT INTO notifications (user_id, type, payload)
             VALUES ($1, 'low_stock', $2)`,
            [
              ownerId,
              JSON.stringify({
                shopId,
                shopName,
                productId,
                productName: prodName,
                quantity,
                threshold,
                message: `Low stock alert: "${prodName}" has only ${quantity} units left in ${shopName}.`,
              }),
            ]
          );
          logger.info(`Low stock notification sent to shop owner ${ownerId} for product ${prodName}`);
        }
        break;
      }

      case 'shop.approved': {
        const { shopId, ownerId, shopName } = data;
        await query(
          `INSERT INTO notifications (user_id, type, payload)
           VALUES ($1, 'shop_approved', $2)`,
          [
            ownerId,
            JSON.stringify({
              shopId,
              shopName,
              message: `Congratulations! Your shop "${shopName}" has been approved and is now live on NearbyStock.`,
            }),
          ]
        );
        break;
      }

      case 'shop.suspended': {
        const { shopId, ownerId, shopName, reason } = data;
        await query(
          `INSERT INTO notifications (user_id, type, payload)
           VALUES ($1, 'shop_suspended', $2)`,
          [
            ownerId,
            JSON.stringify({
              shopId,
              shopName,
              reason,
              message: `Your shop "${shopName}" has been suspended. Reason: ${reason || 'Policy violation'}.`,
            }),
          ]
        );
        break;
      }

      case 'search.performed': {
        const { userId, query: searchTxt, productId, lat, lng, resultsCount } = data;
        // Privacy rule (Section 11): Store rounded location grid (approx 100m - 1km precision)
        let locQuery = null;
        let locParams: any[] = [userId || null, searchTxt || null, productId || null, resultsCount || 0];

        if (lat !== undefined && lng !== undefined) {
          const roundedLat = Math.round(lat * 100) / 100;
          const roundedLng = Math.round(lng * 100) / 100;
          await query(
            `INSERT INTO search_logs (user_id, query, product_id, location, results_count)
             VALUES ($1, $2, $3, ST_MakePoint($4, $5), $6)`,
            [userId || null, searchTxt || null, productId || null, roundedLng, roundedLat, resultsCount || 0]
          );
        } else {
          await query(
            `INSERT INTO search_logs (user_id, query, product_id, results_count)
             VALUES ($1, $2, $3, $4)`,
            locParams
          );
        }
        break;
      }

      default:
        logger.debug(`Unhandled event: ${eventName}`);
    }
  } catch (err: any) {
    logger.error(`Error processing background event ${eventName}: ${err.message}`, { err });
  }
}

