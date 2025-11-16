import { apiClient } from './apiClient';

export const cityService = {
  getCities: () => {
    return apiClient.get('cities');
  },
  getSuppliers: (cityId: string) => {
    return apiClient.get(`cities/${cityId}/suppliers`);
  },
  getDeals: (cityId: string) => {
    return apiClient.get(`cities/${cityId}/deals`);
  },
  getDealDetails: (dealId: string) => {
    return apiClient.get(`deals/${dealId}`);
  },
  getSupplierDetails: (supplierId: string) => {
    return apiClient.get(`suppliers/${supplierId}`);
  },
};