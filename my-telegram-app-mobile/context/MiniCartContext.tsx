import React, { createContext, useState, useContext } from 'react';

const MiniCartContext = createContext<any>(null);

export const useMiniCart = () => {
    const context = useContext(MiniCartContext);
    if (!context) {
        throw new Error('useMiniCart must be used within MiniCartProvider');
    }
    return context;
};

export const MiniCartProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeItem, setActiveItem] = useState<any>(null);

    const showMiniCartBar = (product: any) => {
        setActiveItem(product);
        // In mobile, we might show a toast or snackbar instead of a persistent bar
        console.log("Item added to cart (MiniCart):", product.name);
    };

    const hideMiniCartBar = () => {
        setActiveItem(null);
    };

    const value = {
        activeMiniCartItem: activeItem,
        showActiveItemControls: !!activeItem,
        showMiniCartBar,
        hideMiniCartBar,
    };

    return (
        <MiniCartContext.Provider value={value}>
            {children}
        </MiniCartContext.Provider>
    );
};
