import React, { createContext, useState, useContext, useCallback } from 'react';

interface Filters {
  category: string;
  minPrice: string | number;
  maxPrice: string | number;
  onSale: boolean;
  supplier: string | null;
  searchQuery: string;
}

interface FilterContextType {
  currentFilters: Filters;
  handleFiltersChange: (newFilters: Partial<Filters>) => void;
  resetFilters: () => void;
  setSupplierFilter: (supplierName: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

const initialFilters: Filters = {
  category: 'all',
  minPrice: '',
  maxPrice: '',
  onSale: false,
  supplier: null,
  searchQuery: '',
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const handleFiltersChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const setSupplierFilter = useCallback((supplierName: string) => {
    setFilters(prev => ({
      ...initialFilters,
      supplier: supplierName,
      searchQuery: supplierName
    }));
  }, []);

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