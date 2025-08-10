// src/services/supplierService.js - Service for supplier-specific operations
import apiClient from './apiClient';

export const supplierService = {
    // Get supplier's own profile
    getProfile: () => {
        return apiClient.get('/api/supplier/profile');
    },

    // Update supplier profile
    updateProfile: (profileData) => {
        return apiClient.put('/api/supplier/profile', profileData);
    },

    // Get supplier's products with pagination and filters
    getProducts: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                searchParams.append(key, params[key]);
            }
        });
        return apiClient.get(`/api/supplier/products?${searchParams}`);
    },

    // Create new product
    createProduct: (productData) => {
        return apiClient.post('/api/supplier/products', productData);
    },

    // Update product
    updateProduct: (productId, productData) => {
        return apiClient.put(`/api/supplier/products/${productId}`, productData);
    },

    // Delete product
    deleteProduct: (productId) => {
        return apiClient.delete(`/api/supplier/products/${productId}`);
    },

    // Quick actions for products
    setProductOutOfStock: (productId) => {
        return apiClient.put(`/api/supplier/products/${productId}`, { stock_level: 0 });
    },

    setProductInStock: (productId, stockLevel = 10) => {
        return apiClient.put(`/api/supplier/products/${productId}`, { stock_level: stockLevel });
    },

    toggleProductSale: (productId, isOnSale, discountPrice = null) => {
        return apiClient.put(`/api/supplier/products/${productId}`, { 
            is_on_sale: isOnSale,
            discount_price: discountPrice 
        });
    },

    // Bulk operations
    bulkUpdateStock: (updates) => {
        return apiClient.put('/api/supplier/products/bulk-stock', { updates });
    },

    bulkToggleSale: async (productIds, isOnSale, discountPercentage = 20) => {
        const promises = productIds.map(async (productId) => {
            // Get current product to calculate discount price
            const product = await apiClient.get(`/api/products/${productId}`);
            const discountPrice = isOnSale ? product.price * (1 - discountPercentage / 100) : null;
            
            return apiClient.put(`/api/supplier/products/${productId}`, {
                is_on_sale: isOnSale,
                discount_price: discountPrice
            });
        });
        
        return Promise.all(promises);
    },

    // Get supplier's orders
    getOrders: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                searchParams.append(key, params[key]);
            }
        });
        return apiClient.get(`/api/supplier/orders?${searchParams}`);
    },

    // Update order item status
    updateOrderItemStatus: (orderItemId, status) => {
        return apiClient.put(`/api/supplier/order-items/${orderItemId}/status`, { status });
    },

    // Get supplier's deals
    getDeals: () => {
        return apiClient.get('/api/deals/supplier/deals');
    },

    // Create deal
    createDeal: (dealData) => {
        return apiClient.post('/api/deals/supplier/deals', dealData);
    },

    // Update deal
    updateDeal: (dealId, dealData) => {
        return apiClient.put(`/api/deals/supplier/deals/${dealId}`, dealData);
    },

    // Delete deal
    deleteDeal: (dealId) => {
        return apiClient.delete(`/api/deals/supplier/deals/${dealId}`);
    },

    // Get delivery agents
    getDeliveryAgents: () => {
        return apiClient.get('/api/supplier/delivery-agents');
    },

    // Create delivery agent
    createDeliveryAgent: (agentData) => {
        return apiClient.post('/api/supplier/delivery-agents', agentData);
    },

    // Update delivery agent
    updateDeliveryAgent: (agentId, agentData) => {
        return apiClient.put(`/api/supplier/delivery-agents/${agentId}`, agentData);
    },

    // Delete delivery agent
    deleteDeliveryAgent: (agentId) => {
        return apiClient.delete(`/api/supplier/delivery-agents/${agentId}`);
    },

    // Toggle delivery agent status
    toggleDeliveryAgentStatus: (agentId) => {
        return apiClient.put(`/api/supplier/delivery-agents/${agentId}/toggle-active`);
    },

    // Get cities (for city selection)
    getCities: () => {
        return apiClient.get('/api/cities');
    },

    // Get supplier cities (cities where supplier operates)
    getSupplierCities: () => {
        return apiClient.get('/api/supplier/cities');
    },

    // Update supplier cities
    updateSupplierCities: (cityIds) => {
        return apiClient.put('/api/supplier/cities', { city_ids: cityIds });
    },

    // Analytics and stats
    getStats: () => {
        return apiClient.get('/api/supplier/stats');
    },
};