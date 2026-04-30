import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { Product } from '@/types';

interface MiniCartContextType {
    activeMiniCartItem: Product | null;
    showActiveItemControls: boolean;
    showMiniCartBar: (product: Product) => void;
    hideMiniCartBar: () => void;
}

const MiniCartContext = createContext<MiniCartContextType | null>(null);

export const useMiniCart = () => {
    const context = useContext(MiniCartContext);
    if (!context) {
        throw new Error('useMiniCart must be used within MiniCartProvider');
    }
    return context;
};

export const MiniCartProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeItem, setActiveItem] = useState<Product | null>(null);

    const showMiniCartBar = useCallback((product: Product) => {
        setActiveItem(product);
    }, []);

    const hideMiniCartBar = useCallback(() => {
        setActiveItem(null);
    }, []);

    const value = useMemo(() => ({
        activeMiniCartItem: activeItem,
        showActiveItemControls: !!activeItem,
        showMiniCartBar,
        hideMiniCartBar,
    }), [activeItem, showMiniCartBar, hideMiniCartBar]);

    return (
        <MiniCartContext.Provider value={value}>
            {children}
        </MiniCartContext.Provider>
    );
};

