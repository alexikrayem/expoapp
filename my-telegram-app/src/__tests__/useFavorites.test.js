import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock dependencies
vi.mock('../services/userService', () => ({
    userService: {
        getFavorites: vi.fn(),
        addFavorite: vi.fn(),
        removeFavorite: vi.fn()
    }
}));

vi.mock('../services/authService', () => ({
    authService: {
        isAuthenticated: vi.fn()
    }
}));

vi.mock('../context/ToastContext', () => ({
    useToast: () => ({
        showToast: vi.fn()
    })
}));

import { useFavorites } from '../hooks/useFavorites';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

describe('useFavorites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty favorites when user is not authenticated', async () => {
        authService.isAuthenticated.mockReturnValue(false);

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        expect(result.current.favoriteIds.size).toBe(0);
    });

    it('fetches favorites when user is authenticated', async () => {
        authService.isAuthenticated.mockReturnValue(true);
        userService.getFavorites.mockResolvedValue({ favorite_ids: [1, 2, 3] });

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        expect(result.current.favoriteIds.has(1)).toBe(true);
        expect(result.current.favoriteIds.has(2)).toBe(true);
        expect(result.current.favoriteIds.has(3)).toBe(true);
    });

    it('isFavorite helper returns correct boolean', async () => {
        authService.isAuthenticated.mockReturnValue(true);
        userService.getFavorites.mockResolvedValue({ favorite_ids: [5, 10] });

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        expect(result.current.isFavorite(5)).toBe(true);
        expect(result.current.isFavorite(10)).toBe(true);
        expect(result.current.isFavorite(99)).toBe(false);
    });

    it('toggleFavorite adds item when not favorited', async () => {
        authService.isAuthenticated.mockReturnValue(true);
        userService.getFavorites.mockResolvedValue({ favorite_ids: [] });
        userService.addFavorite.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        await act(async () => {
            await result.current.toggleFavorite(42);
        });

        expect(userService.addFavorite).toHaveBeenCalledWith(42);
        expect(result.current.favoriteIds.has(42)).toBe(true);
    });

    it('toggleFavorite removes item when already favorited', async () => {
        authService.isAuthenticated.mockReturnValue(true);
        userService.getFavorites.mockResolvedValue({ favorite_ids: [42] });
        userService.removeFavorite.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        expect(result.current.favoriteIds.has(42)).toBe(true);

        await act(async () => {
            await result.current.toggleFavorite(42);
        });

        expect(userService.removeFavorite).toHaveBeenCalledWith(42);
        expect(result.current.favoriteIds.has(42)).toBe(false);
    });

    it('reverts optimistic update on API failure', async () => {
        authService.isAuthenticated.mockReturnValue(true);
        userService.getFavorites.mockResolvedValue({ favorite_ids: [] });
        userService.addFavorite.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useFavorites());

        await waitFor(() => {
            expect(result.current.isLoadingFavorites).toBe(false);
        });

        await act(async () => {
            await result.current.toggleFavorite(42);
        });

        // Should revert to original state (not favorited)
        expect(result.current.favoriteIds.has(42)).toBe(false);
    });
});
