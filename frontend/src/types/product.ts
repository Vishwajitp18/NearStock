export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  category_id?: number;
  category_name?: string;
  unit: string;
  image_url?: string;
  description?: string;
  is_verified?: boolean;
}

