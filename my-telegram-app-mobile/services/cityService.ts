import { apiClient } from '../api/apiClient';

export const cityService = {
    getCities: () => {
        return apiClient('cities');
    },
    getSuppliers: (cityId: string) => {
        return apiClient(`cities/${cityId}/suppliers`);
    },
    getDeals: (cityId: string) => {
        return apiClient(`cities/${cityId}/deals`);
    },
    getDealDetails: (dealId: string) => {
        return apiClient(`deals/${dealId}`);
    },
    getSupplierDetails: (supplierId: string) => {
        return apiClient(`suppliers/${supplierId}`);
    },
};
