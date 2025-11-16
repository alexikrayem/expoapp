import { apiClient } from './apiClient';

export const orderService = {
  getUserOrders: () => {
    return apiClient.get('orders');
  },
  createOrderFromCart: (orderData: any) => {
    return apiClient.post('orders/from-cart', orderData);
  },
  // Update order status function
  updateOrderStatus: (orderId: string, status: string) => {
    return apiClient.put(`orders/${orderId}/status`, { status });
  },
};