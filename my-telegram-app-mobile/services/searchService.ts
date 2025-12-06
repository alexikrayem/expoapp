import { apiClient } from '../api/apiClient';

export const searchService = {
    search: (term: string, cityId: string, limit: number = 10) => {
        const params = new URLSearchParams({
            searchTerm: term,
            cityId: cityId,
            limit: limit.toString()
        });
        return apiClient(`search?${params.toString()}`);
    },

    getRecentSearches: () => {
        // In a real app, this might come from local storage or API
        return Promise.resolve([]);
    },

    clearRecentSearches: () => {
        return Promise.resolve();
    }
};
