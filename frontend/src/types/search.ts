export interface SearchResultItem {
  shop: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    phone: string;
    address?: string;
  };
  price: number;
  mrp?: number | null;
  in_stock: boolean;
  quantity_hint: string;
  distance_m: number;
  eta_seconds: number;
  eta_estimated?: boolean;
  stock_updated_at: string;
  tags: ('nearest' | 'fastest' | 'cheapest' | string)[];
}

export interface SearchResponse {
  query: string;
  product: {
    id: string;
    name: string;
    unit?: string;
    brand?: string;
  } | null;
  radius_m: number;
  radius_auto_expanded?: boolean;
  original_radius_m?: number;
  sort: 'best' | 'nearest' | 'fastest' | 'cheapest';
  results: SearchResultItem[];
  message?: string;
}

export interface SearchFilters {
  sort: 'best' | 'nearest' | 'fastest' | 'cheapest';
  radius: number;
  openOnly: boolean;
  inStockOnly: boolean;
  deliveryOnly: boolean;
  minRating: number;
  maxPrice?: number;
  categoryId?: number;
}

