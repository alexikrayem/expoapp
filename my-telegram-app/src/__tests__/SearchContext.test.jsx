import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the debounce hook to return immediately
vi.mock('../hooks/useDebounce', () => ({
    useDebounce: (value) => value
}));

// Mock searchService
vi.mock('../services/searchService', () => ({
    searchService: {
        search: vi.fn()
    }
}));

// Mock constants
vi.mock('../utils/constants', () => ({
    PAGINATION: {
        SEARCH_LIMIT: 20
    }
}));

import { SearchProvider, useSearch } from '../context/SearchContext';
import { searchService } from '../services/searchService';

describe('SearchContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }) => (
        <SearchProvider cityId={1}>{children}</SearchProvider>
    );

    it('provides initial search state', () => {
        const { result } = renderHook(() => useSearch(), { wrapper });

        expect(result.current.searchTerm).toBe('');
        expect(result.current.isSearching).toBe(false);
        expect(result.current.searchResults.products.items).toEqual([]);
        expect(result.current.showSearchResults).toBe(false);
    });

    it('handleSearchTermChange updates searchTerm', () => {
        const { result } = renderHook(() => useSearch(), { wrapper });

        act(() => {
            result.current.handleSearchTermChange('test query');
        });

        expect(result.current.searchTerm).toBe('test query');
    });

    it('clearSearch resets state', () => {
        const { result } = renderHook(() => useSearch(), { wrapper });

        act(() => {
            result.current.handleSearchTermChange('some search');
        });

        act(() => {
            result.current.clearSearch();
        });

        expect(result.current.searchTerm).toBe('');
        expect(result.current.showSearchResults).toBe(false);
    });

    it('performs search when term is 2+ characters', async () => {
        searchService.search.mockResolvedValue({
            results: {
                products: { items: [{ id: 1, name: 'Test Product' }], totalItems: 1 },
                deals: [],
                suppliers: []
            }
        });

        const { result } = renderHook(() => useSearch(), { wrapper });

        act(() => {
            result.current.handleSearchTermChange('te');
        });

        await waitFor(() => {
            expect(result.current.isSearching).toBe(false);
        });

        expect(searchService.search).toHaveBeenCalledWith('te', 1, 20);
        expect(result.current.searchResults.products.items).toHaveLength(1);
        expect(result.current.showSearchResults).toBe(true);
    });

    it('does not search when term is less than 2 characters', async () => {
        const { result } = renderHook(() => useSearch(), { wrapper });

        act(() => {
            result.current.handleSearchTermChange('t');
        });

        // Wait a bit to ensure no search is triggered
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(searchService.search).not.toHaveBeenCalled();
        expect(result.current.showSearchResults).toBe(false);
    });

    it('handles search errors gracefully', async () => {
        searchService.search.mockRejectedValue(new Error('Search failed'));

        const { result } = renderHook(() => useSearch(), { wrapper });

        act(() => {
            result.current.handleSearchTermChange('error test');
        });

        await waitFor(() => {
            expect(result.current.isSearching).toBe(false);
        });

        expect(result.current.searchError).toBe('Search failed');
    });

    it('manages search popover open state', () => {
        const { result } = renderHook(() => useSearch(), { wrapper });

        expect(result.current.isSearchPopoverOpen).toBe(false);

        act(() => {
            result.current.setIsSearchPopoverOpen(true);
        });

        expect(result.current.isSearchPopoverOpen).toBe(true);
    });
});
