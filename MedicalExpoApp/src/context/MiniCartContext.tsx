import React, { createContext, useState, useContext, useCallback } from 'react';

interface MiniCartContextType {
  activeMiniCartItem: any;
  showActiveItemControls: boolean;
  showMiniCartBar: (product: any) => void;
  hideMiniCartBar: () => void;
}

const MiniCartContext = createContext<MiniCartContextType | undefined>(undefined);

export const useMiniCart = () => {
  const context = useContext(MiniCartContext);
  if (!context) {
    throw new Error('useMiniCart must be used within a MiniCartProvider');
  }
  return context;
};

export const MiniCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeItem, setActiveItem] = useState<any>(null);

  // This is the function any component will call to show the bar
  const showMiniCartBar = useCallback((product: any) => {
    setActiveItem(product);
  }, []);

  const hideMiniCartBar = useCallback(() => {
    setActiveItem(null);
  }, []);

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