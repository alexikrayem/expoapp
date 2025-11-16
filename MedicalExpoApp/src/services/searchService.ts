import { apiClient } from './apiClient';

export const searchService = {
  search: (term: string, cityId: string, limit: number) => {
    const params = new URLSearchParams({ searchTerm: term, cityId, limit: limit.toString() });
    return apiClient.get(`search?${params.toString()}`);
  },
};