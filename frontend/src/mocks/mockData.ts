import { Product, Category } from '../types/product';
import { Shop, InventoryItem } from '../types/shop';
import { SearchResultItem } from '../types/search';

export const mockCategories: Category[] = [
  { id: 1, name: 'Dairy & Breakfast' },
  { id: 2, name: 'Foodgrains, Oil & Masala' },
  { id: 3, name: 'Snacks & Branded Foods' },
  { id: 4, name: 'Pharma & Wellness' },
  { id: 5, name: 'Personal Care' },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Amul Butter 500g',
    brand: 'Amul',
    barcode: '8901262010053',
    unit: '500 g',
    category_id: 1,
    category_name: 'Dairy & Breakfast',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300',
    description: 'Pure pasteurized table butter',
    is_verified: true,
  },
  {
    id: 'prod-2',
    name: 'Amul Taaza Toned Milk 1L',
    brand: 'Amul',
    barcode: '8901262010060',
    unit: '1 L',
    category_id: 1,
    category_name: 'Dairy & Breakfast',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
    is_verified: true,
  },
  {
    id: 'prod-3',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    brand: 'Aashirvaad',
    barcode: '8901030383854',
    unit: '5 kg',
    category_id: 2,
    category_name: 'Foodgrains, Oil & Masala',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
    is_verified: true,
  },
  {
    id: 'prod-4',
    name: 'Maggi 2-Minute Instant Noodles 280g',
    brand: 'Nestle',
    barcode: '8901058852325',
    unit: '280 g',
    category_id: 3,
    category_name: 'Snacks & Branded Foods',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300',
    is_verified: true,
  },
  {
    id: 'prod-5',
    name: 'Paracetamol 500mg Tablets 10s',
    brand: 'Calpol',
    barcode: '8901058852999',
    unit: 'strip of 10',
    category_id: 4,
    category_name: 'Pharma & Wellness',
    is_verified: true,
  },
];

export const mockShops: Shop[] = [
  {
    id: 'shop-1',
    name: 'Sharma General Store',
    description: 'Fresh dairy and daily groceries right next to Brigade Road',
    phone: '+91 98888 88881',
    address: 'Shop 4, Brigade Road, Bangalore',
    lat: 12.9716,
    lng: 77.5946,
    status: 'approved',
    is_open_now: true,
    delivery_available: true,
    delivery_radius_m: 3000,
    avg_rating: 4.6,
    distance_m: 450,
  },
  {
    id: 'shop-2',
    name: 'Gupta Provisions & Wholesale',
    description: 'Unbeatable wholesale prices on all packaged groceries',
    phone: '+91 98888 88882',
    address: '12 Commercial Street, Bangalore',
    lat: 12.9780,
    lng: 77.6010,
    status: 'approved',
    is_open_now: true,
    delivery_available: false,
    avg_rating: 4.8,
    distance_m: 1200,
  },
  {
    id: 'shop-3',
    name: 'Metro Supermarket',
    description: 'Modern supermarket with multi-aisle grocery collection',
    phone: '+91 98888 88883',
    address: '88 Richmond Road, Bangalore',
    lat: 12.9650,
    lng: 77.5880,
    status: 'approved',
    is_open_now: true,
    delivery_available: true,
    delivery_radius_m: 5000,
    avg_rating: 4.3,
    distance_m: 1650,
  },
  {
    id: 'shop-4',
    name: 'Apollo Pharmacy & Wellness',
    description: '24/7 medicines and healthcare essentials',
    phone: '+91 98888 88884',
    address: '5 Resthouse Road, Bangalore',
    lat: 12.9730,
    lng: 77.5990,
    status: 'approved',
    is_open_now: true,
    delivery_available: true,
    avg_rating: 4.7,
    distance_m: 850,
  },
];

export const mockSearchResults: SearchResultItem[] = [
  {
    shop: {
      id: 'shop-1',
      name: 'Sharma General Store',
      lat: 12.9716,
      lng: 77.5946,
      phone: '+91 98888 88881',
      address: 'Shop 4, Brigade Road, Bangalore',
    },
    price: 285.0,
    mrp: 290.0,
    in_stock: true,
    quantity_hint: 'In stock',
    distance_m: 450,
    eta_seconds: 240,
    eta_estimated: false,
    stock_updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    tags: ['nearest', 'fastest'],
  },
  {
    shop: {
      id: 'shop-2',
      name: 'Gupta Provisions & Wholesale',
      lat: 12.9780,
      lng: 77.6010,
      phone: '+91 98888 88882',
      address: '12 Commercial Street, Bangalore',
    },
    price: 279.0,
    mrp: 290.0,
    in_stock: true,
    quantity_hint: 'In stock',
    distance_m: 1200,
    eta_seconds: 420,
    eta_estimated: false,
    stock_updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    tags: ['cheapest'],
  },
  {
    shop: {
      id: 'shop-3',
      name: 'Metro Supermarket',
      lat: 12.9650,
      lng: 77.5880,
      phone: '+91 98888 88883',
      address: '88 Richmond Road, Bangalore',
    },
    price: 289.0,
    mrp: 290.0,
    in_stock: true,
    quantity_hint: 'Few left',
    distance_m: 1650,
    eta_seconds: 510,
    eta_estimated: true,
    stock_updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    tags: [],
  },
];

export interface MockUserItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'customer' | 'shopkeeper' | 'admin';
  is_active: boolean;
  created_at: string;
}

export const mockUsers: MockUserItem[] = [
  {
    id: 'usr-1',
    name: 'Rajesh Kumar',
    phone: '+91 98888 11111',
    email: 'rajesh.k@example.com',
    role: 'customer',
    is_active: true,
    created_at: '2026-09-12T10:30:00Z',
  },
  {
    id: 'usr-2',
    name: 'Ramesh Sharma',
    phone: '+91 98888 88881',
    email: 'sharma.store@example.com',
    role: 'shopkeeper',
    is_active: true,
    created_at: '2026-09-15T14:20:00Z',
  },
  {
    id: 'usr-3',
    name: 'Admin User',
    phone: '+91 99999 99999',
    email: 'admin@nearstock.in',
    role: 'admin',
    is_active: true,
    created_at: '2026-08-01T08:00:00Z',
  },
  {
    id: 'usr-4',
    name: 'Vikram Patel',
    phone: '+91 98888 22222',
    email: 'vikram.p@example.com',
    role: 'customer',
    is_active: false,
    created_at: '2026-10-01T11:45:00Z',
  },
  {
    id: 'usr-5',
    name: 'Sunil Gupta',
    phone: '+91 98888 88882',
    email: 'gupta.provisions@example.com',
    role: 'shopkeeper',
    is_active: true,
    created_at: '2026-09-20T09:15:00Z',
  },
];

export interface MockSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

export const mockSessions: MockSession[] = [
  {
    id: 'sess-1',
    device: 'Apple MacBook Pro (macOS)',
    browser: 'Chrome 131.0',
    ip: '103.21.144.10',
    location: 'Bangalore, India',
    last_active: 'Active now',
    is_current: true,
  },
  {
    id: 'sess-2',
    device: 'Apple iPhone 15 Pro',
    browser: 'Mobile Safari 18.1',
    ip: '103.21.144.88',
    location: 'Bangalore, India',
    last_active: '2 hours ago',
    is_current: false,
  },
  {
    id: 'sess-3',
    device: 'Dell XPS 15 (Windows 11)',
    browser: 'Firefox 133.0',
    ip: '49.36.12.19',
    location: 'Mumbai, India',
    last_active: '3 days ago',
    is_current: false,
  },
];

export interface MockOrderItem {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_phone: string;
  shop_address: string;
  customer_name?: string;
  customer_phone?: string;
  status: 'placed' | 'accepted' | 'ready' | 'completed' | 'cancelled';
  type: 'reserve_pickup' | 'delivery';
  total: number;
  created_at: string;
  items_summary: string;
}

export const mockOrders: MockOrderItem[] = [
  {
    id: 'ORD-9821',
    shop_id: 'shop-1',
    shop_name: 'Sharma General Store',
    shop_phone: '+91 98888 88881',
    shop_address: 'Shop 4, Brigade Road, Bangalore',
    customer_name: 'Rajesh Kumar',
    customer_phone: '+91 98888 11111',
    status: 'ready',
    type: 'reserve_pickup',
    total: 570,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    items_summary: '2x Amul Butter 500g',
  },
  {
    id: 'ORD-9812',
    shop_id: 'shop-2',
    shop_name: 'Gupta Provisions & Wholesale',
    shop_phone: '+91 98888 88882',
    shop_address: '12 Commercial Street, Bangalore',
    customer_name: 'Rajesh Kumar',
    customer_phone: '+91 98888 11111',
    status: 'completed',
    type: 'reserve_pickup',
    total: 1120,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    items_summary: '1x Aashirvaad Atta 5kg, 4x Maggi Noodles',
  },
  {
    id: 'ORD-9755',
    shop_id: 'shop-4',
    shop_name: 'Apollo Pharmacy & Wellness',
    shop_phone: '+91 98888 88884',
    shop_address: '5 Resthouse Road, Bangalore',
    customer_name: 'Rajesh Kumar',
    customer_phone: '+91 98888 11111',
    status: 'placed',
    type: 'reserve_pickup',
    total: 240,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    items_summary: '2x Paracetamol 500mg Tablets 10s',
  },
];

