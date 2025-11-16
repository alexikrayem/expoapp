import AsyncStorage from '@react-native-async-storage/async-storage';
import Environment from '../config/environment';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = Environment.API_BASE_URL;
    this.initialize(); // Auto-initialize on creation
  }

  // Initialize the client with a token
  async initialize() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        this.token = token;
      }
    } catch (error) {
      console.error('Failed to initialize API client with token', error);
    }
  }

  // Method to set the authentication token
  async setToken(token: string) {
    this.token = token;
    try {
      await AsyncStorage.setItem('accessToken', token);
    } catch (error) {
      console.error('Failed to save token to storage', error);
      throw error;
    }
  }

  // Method to clear the authentication token
  async clearToken() {
    this.token = null;
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Failed to clear tokens from storage', error);
      throw error;
    }
  }

  // Generic request method
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/${Environment.API_VERSION}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    } as Record<string, string>;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Attempt to parse response as JSON, but handle non-JSON responses gracefully
      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        // For non-JSON responses, try to get text and handle appropriately
        const textResponse = await response.text();
        try {
          responseData = JSON.parse(textResponse);
        } catch {
          // If it's not JSON, return the text response
          responseData = textResponse;
        }
      }

      if (!response.ok) {
        throw new Error(responseData?.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred',
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();