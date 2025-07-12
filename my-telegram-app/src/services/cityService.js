// src/services/cityService.js
import { apiClient } from '../api/apiClient';

export const cityService = {
    getCities: () => {
        return apiClient('cities');
    },
    getSuppliers: (cityId) => {
        return apiClient(`cities/${cityId}/suppliers`);
    },
    getDeals: (cityId) => {
        return apiClient(`cities/${cityId}/deals`);
    },
    getDealDetails: (dealId) => {
        return apiClient(`deals/${dealId}`);
    },
    getSupplierDetails: (supplierId) => {
        return apiClient(`suppliers/${supplierId}`);
    },
};