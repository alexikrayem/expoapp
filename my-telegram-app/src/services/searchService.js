// src/services/searchService.js (FINAL CORRECTED VERSION)
import { apiClient } from '../api/apiClient';

export const searchService = {
    search: (term, cityId, limit) => {
        const params = new URLSearchParams({ term, cityId, limit });
        // FIX: The "api/" prefix has been removed.
        return apiClient(`search?${params.toString()}`);
    },
};