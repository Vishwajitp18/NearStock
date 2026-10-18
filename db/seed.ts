import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/retail';

export async function runSeeds() {
  const pool = new Pool({ connectionString });
  console.log(`Seeding database at ${connectionString}...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing seed data
    await client.query(`
      TRUNCATE TABLE stock_movements, order_items, orders, reviews, 
      favourite_shops, search_logs, notifications, device_tokens,
      inventory, shop_hours, shops, products, categories, users CASCADE;
    `);

    // 1. Categories
    console.log('Seeding categories...');
    const catDairy = (await client.query(
      `INSERT INTO categories (name) VALUES ('Dairy & Breakfast') RETURNING id`
    )).rows[0].id;

    const catStaples = (await client.query(
      `INSERT INTO categories (name) VALUES ('Foodgrains, Oil & Masala') RETURNING id`
    )).rows[0].id;

    const catSnacks = (await client.query(
      `INSERT INTO categories (name) VALUES ('Snacks & Branded Foods') RETURNING id`
    )).rows[0].id;

    const catPersonalCare = (await client.query(
      `INSERT INTO categories (name) VALUES ('Personal Care') RETURNING id`
    )).rows[0].id;

    // 2. Users (Admin, Shopkeepers, Customers)
    console.log('Seeding users...');
    const defaultPasswordHash = await bcrypt.hash('secret123', 10);

    const adminUser = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('admin', 'Master Admin', '+919999999999', 'admin@hyperlocal.io', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    const shopkeeper1 = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('shopkeeper', 'Ramesh Sharma', '+919888888881', 'sharma@store.in', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    const shopkeeper2 = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('shopkeeper', 'Suresh Gupta', '+919888888882', 'gupta@store.in', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    const shopkeeper3 = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('shopkeeper', 'Anil Mehta', '+919888888883', 'mehta@supermarket.in', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    const customer1 = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('customer', 'Rahul Verma', '+919777777771', 'rahul@gmail.com', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    const customer2 = (await client.query(`
      INSERT INTO users (role, name, phone, email, password_hash)
      VALUES ('customer', 'Priya Nair', '+919777777772', 'priya@gmail.com', $1)
      RETURNING id
    `, [defaultPasswordHash])).rows[0].id;

    // 3. Products
    console.log('Seeding products...');
    const prodAmulButter = (await client.query(`
      INSERT INTO products (name, brand, barcode, category_id, unit, description, created_by, is_verified, image_url)
      VALUES ('Amul Butter 500g', 'Amul', '8901262010053', $1, '500 g', 'Delicious pasteurized butter made from pure milk', $2, TRUE, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400')
      RETURNING id
    `, [catDairy, adminUser])).rows[0].id;

    const prodAmulMilk = (await client.query(`
      INSERT INTO products (name, brand, barcode, category_id, unit, description, created_by, is_verified, image_url)
      VALUES ('Amul Taaza Toned Milk 1L', 'Amul', '8901262010060', $1, '1 L', 'Fresh homogenized toned milk', $2, TRUE, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400')
      RETURNING id
    `, [catDairy, adminUser])).rows[0].id;

    const prodAtta = (await client.query(`
      INSERT INTO products (name, brand, barcode, category_id, unit, description, created_by, is_verified, image_url)
      VALUES ('Aashirvaad Shudh Chakki Atta 5kg', 'Aashirvaad', '8901030383854', $1, '5 kg', '100% whole wheat flour made with traditional chakki process', $2, TRUE, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400')
      RETURNING id
    `, [catStaples, adminUser])).rows[0].id;

    const prodMaggi = (await client.query(`
      INSERT INTO products (name, brand, barcode, category_id, unit, description, created_by, is_verified, image_url)
      VALUES ('Maggi 2-Minute Instant Noodles 280g', 'Nestle', '8901058852325', $1, '280 g', 'Classic masala noodles pack of 4', $2, TRUE, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400')
      RETURNING id
    `, [catSnacks, adminUser])).rows[0].id;

    const prodColgate = (await client.query(`
      INSERT INTO products (name, brand, barcode, category_id, unit, description, created_by, is_verified, image_url)
      VALUES ('Colgate Strong Teeth Dental Cream 200g', 'Colgate', '8901314010529', $1, '200 g', 'Maximum cavity protection with amino shakti', $2, TRUE, 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400')
      RETURNING id
    `, [catPersonalCare, adminUser])).rows[0].id;

    // 4. Shops (Centred around Bangalore MG Road: 12.9716, 77.5946)
    console.log('Seeding shops...');
    // Shop 1: Sharma General Store (450m away)
    const shop1 = (await client.query(`
      INSERT INTO shops (owner_id, name, description, phone, address, city, pincode, location, status, is_open_now, delivery_available, delivery_radius_m, avg_rating)
      VALUES ($1, 'Sharma General Store', 'Your friendly neighborhood grocery store with daily fresh dairy', '+919888888881', 'Shop 4, Brigade Road', 'Bangalore', '560001', ST_MakePoint(77.5946, 12.9716), 'approved', TRUE, TRUE, 3000, 4.6)
      RETURNING id
    `, [shopkeeper1])).rows[0].id;

    // Shop 2: Gupta Provisions (1200m away, cheapest butter)
    const shop2 = (await client.query(`
      INSERT INTO shops (owner_id, name, description, phone, address, city, pincode, location, status, is_open_now, delivery_available, delivery_radius_m, avg_rating)
      VALUES ($1, 'Gupta Provisions & Wholesale', 'Best wholesale and retail prices in town', '+919888888882', '12 Commercial Street', 'Bangalore', '560001', ST_MakePoint(77.6010, 12.9780), 'approved', TRUE, FALSE, NULL, 4.8)
      RETURNING id
    `, [shopkeeper2])).rows[0].id;

    // Shop 3: Metro Supermarket (1800m away)
    const shop3 = (await client.query(`
      INSERT INTO shops (owner_id, name, description, phone, address, city, pincode, location, status, is_open_now, delivery_available, delivery_radius_m, avg_rating)
      VALUES ($1, 'Metro Supermarket', 'One stop shop for premium groceries and packaged items', '+919888888883', '88 Richmond Road', 'Bangalore', '560025', ST_MakePoint(77.5880, 12.9650), 'approved', TRUE, TRUE, 5000, 4.3)
      RETURNING id
    `, [shopkeeper3])).rows[0].id;

    // Shop 4: Fresh Mart (pending approval)
    const shop4 = (await client.query(`
      INSERT INTO shops (owner_id, name, description, phone, address, city, pincode, location, status, is_open_now, delivery_available, avg_rating)
      VALUES ($1, 'Fresh Mart Organics', 'Organic farm-to-table groceries', '+919888888884', '21 Indiranagar 100ft Road', 'Bangalore', '560038', ST_MakePoint(77.6400, 12.9780), 'pending', TRUE, FALSE, 0.0)
      RETURNING id
    `, [shopkeeper1])).rows[0].id;

    // 5. Shop hours (08:00 to 22:00 every day)
    console.log('Seeding shop hours...');
    for (const sId of [shop1, shop2, shop3, shop4]) {
      for (let day = 0; day <= 6; day++) {
        await client.query(`
          INSERT INTO shop_hours (shop_id, weekday, opens_at, closes_at, is_closed)
          VALUES ($1, $2, '08:00:00', '22:00:00', FALSE)
        `, [sId, day]);
      }
    }

    // 6. Inventory & Stock movements
    console.log('Seeding inventory...');
    // Sharma Store: Amul Butter at 285 (MRP 290), qty 8
    const inv1 = (await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 285.00, 290.00, 8, 5)
      RETURNING id
    `, [shop1, prodAmulButter])).rows[0].id;

    await client.query(`
      INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
      VALUES ($1, 8, 'restock', $2)
    `, [inv1, shopkeeper1]);

    // Sharma Store: Amul Milk at 72 (MRP 72), qty 25
    const inv2 = (await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 72.00, 72.00, 25, 10)
      RETURNING id
    `, [shop1, prodAmulMilk])).rows[0].id;

    await client.query(`
      INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
      VALUES ($1, 25, 'restock', $2)
    `, [inv2, shopkeeper1]);

    // Gupta Provisions: Amul Butter at 279 (MRP 290, cheapest!), qty 20
    const inv3 = (await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 279.00, 290.00, 20, 5)
      RETURNING id
    `, [shop2, prodAmulButter])).rows[0].id;

    await client.query(`
      INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
      VALUES ($1, 20, 'restock', $2)
    `, [inv3, shopkeeper2]);

    // Metro Supermarket: Amul Butter at 289 (MRP 290), qty 2 (low stock!)
    const inv4 = (await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 289.00, 290.00, 2, 5)
      RETURNING id
    `, [shop3, prodAmulButter])).rows[0].id;

    await client.query(`
      INSERT INTO stock_movements (inventory_id, change_qty, reason, actor_id)
      VALUES ($1, 2, 'restock', $2)
    `, [inv4, shopkeeper3]);

    // Metro Supermarket: Atta at 255 (MRP 275), qty 14
    const inv5 = (await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 255.00, 275.00, 14, 5)
      RETURNING id
    `, [shop3, prodAtta])).rows[0].id;

    // Sharma Store: Maggi at 55 (MRP 58), qty 30
    await client.query(`
      INSERT INTO inventory (shop_id, product_id, price, mrp, quantity, low_stock_threshold)
      VALUES ($1, $2, 55.00, 58.00, 30, 8)
    `, [shop1, prodMaggi]);

    // 7. Reviews
    console.log('Seeding reviews & favourites...');
    await client.query(`
      INSERT INTO reviews (shop_id, user_id, rating, comment)
      VALUES ($1, $2, 5, 'Always has fresh dairy items and fast pickup!')
    `, [shop1, customer1]);

    await client.query(`
      INSERT INTO reviews (shop_id, user_id, rating, comment)
      VALUES ($1, $2, 5, 'Cheapest prices for groceries around MG Road!')
    `, [shop2, customer2]);

    await client.query(`
      INSERT INTO favourite_shops (user_id, shop_id)
      VALUES ($1, $2)
    `, [customer1, shop1]);

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

