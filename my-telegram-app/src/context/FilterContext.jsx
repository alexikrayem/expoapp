// src/context/FilterContext.jsx
import React, { createContext, useState, useContext } from 'react';

const FilterContext = createContext();

export const useFilters = () => useContext(FilterContext);

const initialFilters = {
    category: 'all',
    minPrice: '',
    maxPrice: '',
    onSale: false,
    supplier: null,
    searchQuery: '',
};

export const FilterProvider = ({ children }) => {
    const [filters, setFilters] = useState(initialFilters);

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
    };

    const resetFilters = () => {
        setFilters(initialFilters);
    };

    const setSupplierFilter = (supplierName) => {
        setFilters(prev => ({
            ...initialFilters,
            supplier: supplierName,
            searchQuery: supplierName
        }));
    };

    const value = {
        currentFilters: filters,
        handleFiltersChange,
        resetFilters,
        setSupplierFilter,
    };

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};