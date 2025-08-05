// src/context/MiniCartContext.jsx
import React, { createContext, useState, useContext } from 'react';

const MiniCartContext = createContext();

export const useMiniCart = () => useContext(MiniCartContext);

export const MiniCartProvider = ({ children }) => {
    const [activeItem, setActiveItem] = useState(null);

    // This is the function any component will call to show the bar
    const showMiniCartBar = (product) => {
        setActiveItem(product);
       
    };
    
    const hideMiniCartBar = () => {
        setActiveItem(null);
    };

    const value = {
        activeMiniCartItem: activeItem,
        // This is a boolean derived from the state: true if there's an item, false otherwise
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