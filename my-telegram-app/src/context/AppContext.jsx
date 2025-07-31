// src/context/AppContext.jsx
import React, { createContext, useContext } from 'react';

// This context will hold the core, stable user data.
const AppContext = createContext(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === null) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};

// The provider component
export const AppProvider = ({ children, value }) => {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};