import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll import from the actual module and test via the exports
// This avoids the complexity of mocking import.meta.env

describe('apiClient', () => {
    let apiClient, setTokens, clearTokens, getAccessToken;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();

        // Reset modules to pick up fresh state
        vi.resetModules();

        // Mock fetch globally
        global.fetch = vi.fn();

        // Re-import the module
        const module = await import('../services/apiClient.js');
        apiClient = module.apiClient;
        setTokens = module.setTokens;
        clearTokens = module.clearTokens;
        getAccessToken = module.getAccessToken;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('token management', () => {
        it('getAccessToken retrieves token from localStorage', () => {
            localStorage.setItem('accessToken', 'my-token');
            expect(getAccessToken()).toBe('my-token');
        });

        it('getAccessToken returns null when no token exists', () => {
            expect(getAccessToken()).toBeNull();
        });

        it('clearTokens removes access token from localStorage', () => {
            localStorage.setItem('accessToken', 'test-token');
            clearTokens();
            expect(localStorage.getItem('accessToken')).toBeNull();
        });
    });

    describe('apiClient function', () => {
        it('makes a GET request by default', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await apiClient('test-endpoint');

            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toContain('test-endpoint');
            expect(options.method).toBe('GET');
            expect(options.credentials).toBe('include');
            expect(result).toEqual({ data: 'test' });
        });

        it('makes a POST request when body is provided', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({ success: true })
            });

            await apiClient('test-endpoint', { body: { key: 'value' } });

            const [, options] = global.fetch.mock.calls[0];
            expect(options.method).toBe('POST');
            expect(options.body).toBe(JSON.stringify({ key: 'value' }));
        });

        it('includes Authorization header when token exists', async () => {
            localStorage.setItem('accessToken', 'bearer-token');

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: () => Promise.resolve({})
            });

            await apiClient('secure-endpoint');

            const [, options] = global.fetch.mock.calls[0];
            expect(options.headers['Authorization']).toBe('Bearer bearer-token');
        });

        it('returns null for 204 No Content responses', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                headers: new Map()
            });

            const result = await apiClient('delete-endpoint', { method: 'DELETE' });
            expect(result).toBeNull();
        });

        it('rejects with error object for failed requests', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ message: 'Bad Request' })
            });

            await expect(apiClient('bad-endpoint')).rejects.toEqual(
                expect.objectContaining({
                    message: 'Bad Request',
                    status: 400
                })
            );
        });
    });
});
