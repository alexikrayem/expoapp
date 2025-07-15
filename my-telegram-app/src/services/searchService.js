import { apiClient } from '../api/apiClient';

export const searchService = {
    search: (term, cityId, limit) => {
        const params = new URLSearchParams({ term, cityId, limit });
        return apiClient(`api/search?${params.toString()}`);
    },
};
