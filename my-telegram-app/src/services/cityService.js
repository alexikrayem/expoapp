import { apiClient } from '../api/apiClient';

export const cityService = {
    getCities: () => {
        return apiClient('api/cities');
    },
    getSuppliers: (cityId) => {
        return apiClient(`api/cities/${cityId}/suppliers`);
    },
    getDeals: (cityId) => {
        return apiClient(`api/cities/${cityId}/deals`);
    },
    getDealDetails: (dealId) => {
        return apiClient(`api/deals/${dealId}`);
    },
    getSupplierDetails: (supplierId) => {
        return apiClient(`api/suppliers/${supplierId}`);
    },
};
