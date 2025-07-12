// src/utils/formatters.js - Utility functions for formatting
export const formatPrice = (price, currency = 'د.إ') => {
    if (price === null || price === undefined) return '...';
    return `${parseFloat(price).toFixed(2)} ${currency}`;
};

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'غير محدد';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
    };
    
    return new Date(dateString).toLocaleDateString('ar-EG', defaultOptions);
};

export const formatDateTime = (dateString) => {
    return formatDate(dateString, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};