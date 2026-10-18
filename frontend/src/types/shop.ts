export interface ShopHours {
  weekday: number;
  opens_at?: string | null;
  closes_at?: string | null;
  is_closed: boolean;
}

export interface Shop {
  id: string;
  owner_id?: string;
  name: string;
  description?: string;
  phone: string;
  address: string;
  city?: string;
  pincode?: string;
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  is_open_now: boolean;
  delivery_available: boolean;
  delivery_radius_m?: number;
  avg_rating: number;
  distance_m?: number;
  hours?: ShopHours[];
  owner_name?: string;
  owner_phone?: string;
}

export interface InventoryItem {
  inventory_id: string;
  product_id: string;
  name: string;
  brand?: string;
  barcode?: string;
  unit: string;
  image_url?: string;
  category_name?: string;
  price: number;
  mrp?: number;
  quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  inventory_id: string;
  product_name: string;
  change_qty: number;
  reason: 'restock' | 'sale' | 'manual_adjust' | 'return' | 'order' | 'expired';
  actor_name?: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

