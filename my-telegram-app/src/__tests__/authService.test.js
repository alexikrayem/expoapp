import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the external dependencies
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock the API client
vi.mock('../api/apiClient', () => ({
  setTokens: vi.fn(),
  apiClient: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('AuthService Tests', () => {
  const ORIGINAL_ENV = process.env;

  let authService;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    global.localStorage = mockLocalStorage;
    vi.clearAllMocks();

    // Clear any stored tokens
    localStorage.clear();

    // Import authService after clearing modules to allow mocking
    const authModule = await import('../services/authService');
    authService = authModule.authService;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('isAuthenticated', () => {
    test('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'valid_token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should return false when no access token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    test('should return false when access token is empty string', () => {
      localStorage.setItem('accessToken', '');
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('telegramLoginWidget', () => {
    test('should successfully authenticate with valid Telegram auth data', async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          userProfile: {
            userId: 123456789,
            fullName: 'John Doe',
            profileCompleted: false
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const authData = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        auth_date: Math.floor(Date.now() / 1000)
      };

      const result = await authService.telegramLoginWidget(authData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/telegram-login-widget'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ authData })
        })
      );

      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        userProfile: {
          userId: 123456789,
          fullName: 'John Doe',
          profileCompleted: false
        }
      });
    });

    test('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid request' })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const authData = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe'
      };

      await expect(authService.telegramLoginWidget(authData)).rejects.toEqual({
        message: 'Invalid request',
        status: 400
      });
    });

    test('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const authData = {
        id: 123456789,
        first_name: 'John'
      };

      await expect(authService.telegramLoginWidget(authData)).rejects.toThrow('Network error');
    });
  });

  describe('devBypassLogin', () => {
    test('should work in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.VITE_DEV_BYPASS_SECRET = 'test_secret';

      const mockResponse = {
        ok: true,
        json: async () => ({
          accessToken: 'dev_token',
          refreshToken: 'dev_refresh_token'
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const result = await authService.devBypassLogin();

      expect(result).toEqual({
        accessToken: 'dev_token',
        refreshToken: 'dev_refresh_token'
      });
    });

    test('should return null in non-development mode', async () => {
      // Import the module again to get access to the internal functions
      const authModule = await import('../services/authService');
      const mockGetIsDevelopment = vi.spyOn(authModule, 'getIsDevelopment').mockReturnValue(false);

      const result = await authService.devBypassLogin();
      expect(result).toBeNull();

      // Restore the original function
      mockGetIsDevelopment.mockRestore();
    });
  });
});