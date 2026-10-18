export type OrderStatus = 'placed' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'expired';
export type OrderType = 'reserve_pickup' | 'delivery';

export interface OrderItem {
  productId: string;
  name?: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  shop_id: string;
  shop_name?: string;
  shop_phone?: string;
  shop_address?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  type: OrderType;
  status: OrderStatus;
  total: number;
  created_at: string;
  items?: OrderItem[];
}

