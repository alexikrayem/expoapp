import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getAccessToken,
    setTokens,
    clearTokens,
    decodeToken,
    isTokenExpiringSoon,
    isAccessTokenValid
} from '../utils/tokenManager';

describe('tokenManager', () => {
    const mockToken = 'header.payload.signature';
    const mockPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour

    // Helper to create a base64 encoded payload
    const encodePayload = (payload) => {
        return btoa(JSON.stringify(payload)).replace(/=/g, '');
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('getAccessToken', () => {
        it('should return null if no token in localStorage', () => {
            expect(getAccessToken()).toBeNull();
        });

        it('should return the token from localStorage', () => {
            localStorage.setItem('accessToken', 'test-token');
            expect(getAccessToken()).toBe('test-token');
        });
    });

    describe('setTokens', () => {
        it('should store the access token in localStorage', () => {
            setTokens('new-token');
            expect(localStorage.getItem('accessToken')).toBe('new-token');
        });
    });

    describe('clearTokens', () => {
        it('should remove the access token from localStorage', () => {
            localStorage.setItem('accessToken', 'to-be-removed');
            clearTokens();
            expect(localStorage.getItem('accessToken')).toBeNull();
        });
    });

    describe('decodeToken', () => {
        it('should return null for invalid tokens', () => {
            expect(decodeToken('')).toBeNull();
            expect(decodeToken('invalid')).toBeNull();
        });

        it('should decode a valid JWT payload', () => {
            const payload = { user: 'test' };
            const token = `header.${encodePayload(payload)}.signature`;
            expect(decodeToken(token)).toEqual(payload);
        });
    });

    describe('isTokenExpiringSoon', () => {
        it('should return true if token is missing or invalid', () => {
            expect(isTokenExpiringSoon(null)).toBe(true);
            expect(isTokenExpiringSoon('invalid')).toBe(true);
        });

        it('should return true if token expires in less than 5 minutes', () => {
            const payload = { exp: Math.floor(Date.now() / 1000) + 120 }; // 2 minutes
            const token = `header.${encodePayload(payload)}.signature`;
            expect(isTokenExpiringSoon(token)).toBe(true);
        });

        it('should return false if token expires in more than 5 minutes', () => {
            const payload = { exp: Math.floor(Date.now() / 1000) + 600 }; // 10 minutes
            const token = `header.${encodePayload(payload)}.signature`;
            expect(isTokenExpiringSoon(token)).toBe(false);
        });
    });

    describe('isAccessTokenValid', () => {
        it('should return false if no token is present', () => {
            expect(isAccessTokenValid()).toBe(false);
        });

        it('should return true if token is present and not expiring soon', () => {
            const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
            const token = `header.${encodePayload(payload)}.signature`;
            localStorage.setItem('accessToken', token);
            expect(isAccessTokenValid()).toBe(true);
        });
    });
});
