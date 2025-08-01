// src/hooks/useCart.js (DEPRECATED - REPLACED BY CONTEXT)
// This file is no longer used since we moved everything to CartContext
// You can delete this file if it's not imported anywhere else

console.warn('useCart hook is deprecated. Use CartContext instead.');

export const useCart = () => {
    throw new Error('useCart hook is deprecated. Use CartContext with useCart() instead.');
};