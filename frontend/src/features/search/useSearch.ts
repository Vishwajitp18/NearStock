import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { SearchResponse, SearchFilters } from '../../types/search';
import { mockSearchResults, mockProducts } from '../../mocks/mockData';

export function useSearch(
  query: string,
  lat: number,
  lng: number,
  filters: SearchFilters
) {
  const useMock = import.meta.env.VITE_USE_MOCK === 'true';

  return useQuery<SearchResponse>({
    queryKey: ['search', query, lat, lng, filters],
    queryFn: async () => {
      if (!query.trim()) {
        return {
          query: '',
          product: null,
          radius_m: filters.radius,
          sort: filters.sort,
          results: [],
        };
      }

      if (useMock) {
        return {
          query,
          product: mockProducts[0],
          radius_m: filters.radius,
          sort: filters.sort,
          results: mockSearchResults,
        };
      }

      try {
        const { data } = await apiClient.get<SearchResponse>('/search', {
          params: {
            q: query,
            lat,
            lng,
            radius: filters.radius,
            sort: filters.sort,
          },
        });
        return data;
      } catch (err) {
        // Graceful mock fallback if backend is offline
        return {
          query,
          product: mockProducts[0],
          radius_m: filters.radius,
          sort: filters.sort,
          results: mockSearchResults,
        };
      }
    },
    enabled: true,
  });
}

