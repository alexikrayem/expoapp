// src/services/supplierService.js - Enhanced service with proper error handling
import apiClient from './apiClient';

export const supplierService = {
    // Get supplier's own profile
    getProfile: async () => {
        try {
            const response = await apiClient.get('/api/supplier/profile');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch profile:', error);
            throw error;
        }
    },

    // Update supplier profile
    updateProfile: async (profileData) => {
        try {
            const response = await apiClient.put('/api/supplier/profile', profileData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to update profile:', error);
            throw error;
        }
    },

    // Get supplier's products with pagination and filters
    getProducts: async (params = {}) => {
        try {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== '') {
                    searchParams.append(key, params[key]);
                }
            });
            const response = await apiClient.get(`/api/supplier/products?${searchParams}`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch products:', error);
            throw error;
        }
    },

    // Create new product
    createProduct: async (productData) => {
        try {
            const response = await apiClient.post('/api/supplier/products', productData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to create product:', error);
            throw error;
        }
    },

    // Update product
    updateProduct: async (productId, productData) => {
        try {
            const response = await apiClient.put(`/api/supplier/products/${productId}`, productData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to update product:', error);
            throw error;
        }
    },

    // Delete product
    deleteProduct: async (productId) => {
        try {
            const response = await apiClient.delete(`/api/supplier/products/${productId}`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to delete product:', error);
            throw error;
        }
    },

    // Bulk operations for products
    bulkUpdateStock: async (updates) => {
        try {
            const response = await apiClient.put('/api/supplier/products/bulk-stock', { updates });
            return response.data;
        } catch (error) {
            console.error('Service: Failed to bulk update stock:', error);
            throw error;
        }
    },

    bulkToggleSale: async (productIds, isOnSale, discountPercentage = 20) => {
        try {
            const response = await apiClient.put('/api/supplier/products/bulk-sale', {
                product_ids: productIds,
                is_on_sale: isOnSale,
                discount_percentage: discountPercentage
            });
            return response.data;
        } catch (error) {
            console.error('Service: Failed to bulk toggle sale:', error);
            throw error;
        }
    },

    // Get supplier's orders
    getOrders: async (params = {}) => {
        try {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== '') {
                    searchParams.append(key, params[key]);
                }
            });
            const response = await apiClient.get(`/api/supplier/orders?${searchParams}`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch orders:', error);
            throw error;
        }
    },

    // Get supplier's deals
    getDeals: async () => {
        try {
            const response = await apiClient.get('/api/deals/supplier/deals');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch deals:', error);
            throw error;
        }
    },

    // Create deal
    createDeal: async (dealData) => {
        try {
            const response = await apiClient.post('/api/deals/supplier/deals', dealData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to create deal:', error);
            throw error;
        }
    },

    // Update deal
    updateDeal: async (dealId, dealData) => {
        try {
            const response = await apiClient.put(`/api/deals/supplier/deals/${dealId}`, dealData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to update deal:', error);
            throw error;
        }
    },

    // Delete deal
    deleteDeal: async (dealId) => {
        try {
            const response = await apiClient.delete(`/api/deals/supplier/deals/${dealId}`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to delete deal:', error);
            throw error;
        }
    },

    // Get delivery agents
    getDeliveryAgents: async () => {
        try {
            const response = await apiClient.get('/api/supplier/delivery-agents');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch delivery agents:', error);
            throw error;
        }
    },

    // Create delivery agent
    createDeliveryAgent: async (agentData) => {
        try {
            const response = await apiClient.post('/api/supplier/delivery-agents', agentData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to create delivery agent:', error);
            throw error;
        }
    },

    // Update delivery agent
    updateDeliveryAgent: async (agentId, agentData) => {
        try {
            const response = await apiClient.put(`/api/supplier/delivery-agents/${agentId}`, agentData);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to update delivery agent:', error);
            throw error;
        }
    },

    // Delete delivery agent
    deleteDeliveryAgent: async (agentId) => {
        try {
            const response = await apiClient.delete(`/api/supplier/delivery-agents/${agentId}`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to delete delivery agent:', error);
            throw error;
        }
    },

    // Toggle delivery agent status
    toggleDeliveryAgentStatus: async (agentId) => {
        try {
            const response = await apiClient.put(`/api/supplier/delivery-agents/${agentId}/toggle-active`);
            return response.data;
        } catch (error) {
            console.error('Service: Failed to toggle delivery agent status:', error);
            throw error;
        }
    },

    // Get cities (for city selection)
    getCities: async () => {
        try {
            const response = await apiClient.get('/api/cities');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch cities:', error);
            throw error;
        }
    },

    // Get supplier cities (cities where supplier operates)
    getSupplierCities: async () => {
        try {
            const response = await apiClient.get('/api/supplier/cities');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch supplier cities:', error);
            throw error;
        }
    },

    // Update supplier cities
    updateSupplierCities: async (cityIds) => {
        try {
            const response = await apiClient.put('/api/supplier/cities', { city_ids: cityIds });
            return response.data;
        } catch (error) {
            console.error('Service: Failed to update supplier cities:', error);
            throw error;
        }
    },

    // Analytics and stats
    getStats: async () => {
        try {
            const response = await apiClient.get('/api/supplier/stats');
            return response.data;
        } catch (error) {
            console.error('Service: Failed to fetch stats:', error);
            throw error;
        }
    },
};