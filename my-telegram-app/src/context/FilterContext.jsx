// src/context/FilterContext.jsx
import React, { createContext, useState, useContext } from 'react';

const FilterContext = createContext();

export const useFilters = () => useContext(FilterContext);

const initialFilters = {
    category: 'all',
    minPrice: '',
    maxPrice: '',
    onSale: false,
};

export const FilterProvider = ({ children }) => {
    const [filters, setFilters] = useState(initialFilters);

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
    };

    const value = {
        currentFilters: filters,
        handleFiltersChange,
    };

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};