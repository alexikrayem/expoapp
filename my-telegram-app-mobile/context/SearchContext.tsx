import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

export type SearchTab = 'products' | 'deals' | 'suppliers';

interface SearchContextType {
    searchTerm: string;
    activeSearchTab: SearchTab;
    handleSearchTermChange: (term: string) => void;
    setActiveSearchTab: (tab: SearchTab) => void;
    clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTab, setActiveSearchTab] = useState<SearchTab>('products');

    const handleSearchTermChange = useCallback((newTerm: string) => {
        setSearchTerm(newTerm);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setActiveSearchTab('products');
    }, []);

    const value = useMemo(() => ({
        searchTerm,
        activeSearchTab,
        handleSearchTermChange,
        setActiveSearchTab,
        clearSearch
    }), [searchTerm, activeSearchTab, handleSearchTermChange, setActiveSearchTab, clearSearch]);

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
};
