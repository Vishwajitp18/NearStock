import { create } from 'zustand';

interface LocationState {
  lat: number;
  lng: number;
  address: string;
  isDetecting: boolean;
  setLocation: (lat: number, lng: number, address?: string) => void;
  detectLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: 12.9716,
  lng: 77.5946,
  address: 'MG Road, Bangalore',
  isDetecting: false,

  setLocation: (lat, lng, address) => {
    set({
      lat,
      lng,
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
  },

  detectLocation: async () => {
    if (!navigator.geolocation) {
      return;
    }

    set({ isDetecting: true });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          set({
            lat,
            lng,
            address: 'Current Location',
            isDetecting: false,
          });
          resolve();
        },
        () => {
          // Fall back gracefully to default
          set({ isDetecting: false });
          resolve();
        },
        { timeout: 8000 }
      );
    });
  },
}));

