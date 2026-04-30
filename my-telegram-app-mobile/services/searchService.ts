import { apiClient } from '../api/apiClient';
import { storage } from '../utils/storage';

const RECENT_SEARCHES_STORAGE_KEY = 'recentSearches_v1';
const MAX_RECENT_SEARCHES = 8;
const MIN_RECENT_SEARCH_TERM_LENGTH = 2;

const sanitizeRecentSearchTerm = (term: string) => term.trim().replace(/\s+/g, ' ');
const normalizeRecentSearchTerm = (term: string) => sanitizeRecentSearchTerm(term).toLowerCase();

const parseRecentSearches = (raw: string | null): string[] => {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((item) => typeof item === 'string')
            .map((item) => sanitizeRecentSearchTerm(item))
            .filter(Boolean)
            .slice(0, MAX_RECENT_SEARCHES);
    } catch {
        return [];
    }
};

const persistRecentSearches = async (recentSearches: string[]) => {
    if (recentSearches.length === 0) {
        await storage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
        return;
    }
    await storage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches.slice(0, MAX_RECENT_SEARCHES)));
};

export const searchService = {
    search: (term: string, cityId: string, limit: number = 10, options: RequestInit = {}) => {
        const params = new URLSearchParams({
            searchTerm: term,
            cityId: cityId,
            limit: limit.toString()
        });
        return apiClient(`search?${params.toString()}`, options);
    },

    getRecentSearches: async () => {
        const recentSearches = parseRecentSearches(await storage.getItem(RECENT_SEARCHES_STORAGE_KEY));
        return recentSearches.slice(0, MAX_RECENT_SEARCHES);
    },

    saveRecentSearch: async (term: string) => {
        const sanitizedTerm = sanitizeRecentSearchTerm(term);
        if (sanitizedTerm.length < MIN_RECENT_SEARCH_TERM_LENGTH) {
            return searchService.getRecentSearches();
        }

        const currentRecentSearches = await searchService.getRecentSearches();
        const normalizedTerm = normalizeRecentSearchTerm(sanitizedTerm);
        const dedupedRecentSearches = currentRecentSearches.filter(
            (item) => normalizeRecentSearchTerm(item) !== normalizedTerm,
        );
        const nextRecentSearches = [sanitizedTerm, ...dedupedRecentSearches].slice(0, MAX_RECENT_SEARCHES);
        await persistRecentSearches(nextRecentSearches);
        return nextRecentSearches;
    },

    removeRecentSearch: async (term: string) => {
        const normalizedTerm = normalizeRecentSearchTerm(term);
        const currentRecentSearches = await searchService.getRecentSearches();
        const nextRecentSearches = currentRecentSearches.filter(
            (item) => normalizeRecentSearchTerm(item) !== normalizedTerm,
        );
        await persistRecentSearches(nextRecentSearches);
        return nextRecentSearches;
    },

    clearRecentSearches: async () => {
        await storage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
        return [];
    }
};
