export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    TIMEOUT: 10000,
};

export const PAGINATION = {
    PRODUCTS_PER_PAGE: 12,
    SEARCH_LIMIT: 10,
};

export const SERVICEABLE_CITIES = [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Umm Al-Quwain',
    'Ras Al-Khaimah',
    'Fujairah'
];

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.PENDING]: 'قيد الانتظار',
    [ORDER_STATUS.CONFIRMED]: 'مؤكد',
    [ORDER_STATUS.SHIPPED]: 'تم الشحن',
    [ORDER_STATUS.DELIVERED]: 'تم التوصيل',
    [ORDER_STATUS.CANCELLED]: 'ملغى',
};

export const CURRENCY = {
    SYMBOL: 'د.إ',
    CODE: 'AED',
};
