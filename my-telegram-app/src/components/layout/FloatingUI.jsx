// src/components/layout/FloatingUI.jsx
import React from 'react';
import { useCart } from '../../context/CartContext';
import { useModal } from '../../context/ModalContext';
import MiniCartBar from '../cart/MiniCartBar';

const FloatingUI = () => {
    const { 
        cartItems, 
        activeMiniCartItem, 
        showActiveItemControls, 
        hideActiveItemControls,
        actions 
    } = useCart();
    
    const { openModal } = useModal();

    return (
        <MiniCartBar
            cartItems={cartItems || []}
            showActiveItemControls={showActiveItemControls}
            activeMiniCartItem={activeMiniCartItem}
            onIncrease={actions.increaseQuantity}
            onDecrease={actions.decreaseQuantity}
            onRemove={actions.removeItem}
            onHideActiveItem={hideActiveItemControls}
            onViewCart={() => {
                hideActiveItemControls();
                openModal('cart');
            }}
        />
    );
};

export default FloatingUI;