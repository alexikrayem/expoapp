// src/services/searchService.js (FIXED)
import { apiClient } from '../api/apiClient';
export const searchService = {
    search: (term, cityId, limit) => {
        const params = new URLSearchParams({ searchTerm: term, cityId, limit }); // ✅ FIXED: changed `term` to `searchTerm`
        return apiClient(`search?${params.toString()}`);
    },
};
