import { create } from 'zustand';
import { User } from '../types/auth';
import { Shop } from '../types/shop';

interface AuthState {
  user: User | null;
  shop: Shop | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string, shop?: Shop | null) => void;
  setShop: (shop: Shop | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('nearstock_user') || 'null'),
  shop: JSON.parse(localStorage.getItem('nearstock_shop') || 'null'),
  accessToken: localStorage.getItem('nearstock_access_token'),
  refreshToken: localStorage.getItem('nearstock_refresh_token'),

  setAuth: (user, accessToken, refreshToken, shop = null) => {
    localStorage.setItem('nearstock_user', JSON.stringify(user));
    localStorage.setItem('nearstock_access_token', accessToken);
    localStorage.setItem('nearstock_refresh_token', refreshToken);
    if (shop) {
      localStorage.setItem('nearstock_shop', JSON.stringify(shop));
    }
    set({ user, accessToken, refreshToken, shop: shop || get().shop });
  },

  setShop: (shop) => {
    if (shop) {
      localStorage.setItem('nearstock_shop', JSON.stringify(shop));
    } else {
      localStorage.removeItem('nearstock_shop');
    }
    set({ shop });
  },

  logout: () => {
    localStorage.removeItem('nearstock_user');
    localStorage.removeItem('nearstock_shop');
    localStorage.removeItem('nearstock_access_token');
    localStorage.removeItem('nearstock_refresh_token');
    set({ user: null, shop: null, accessToken: null, refreshToken: null });
  },

  isAuthenticated: () => !!get().accessToken,
}));

