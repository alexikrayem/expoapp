import React, { createContext, useState, useContext, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchService } from '@/services/searchService';
import { useAuth } from './AuthContext';

interface SearchContextType {
    searchTerm: string;
    isSearching: boolean;
    searchResults: {
        products: { items: any[], totalItems: number };
        deals: any[];
        suppliers: any[];
    };
    searchError: string | null;
    handleSearchTermChange: (term: string) => void;
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
    const { userProfile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({
        products: { items: [], totalItems: 0 },
        deals: [],
        suppliers: []
    });
    const [searchError, setSearchError] = useState<string | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const cityId = userProfile?.selected_city_id || '1'; // Default to 1 if no city selected

    useEffect(() => {
        const performSearch = async () => {
            const trimmedTerm = debouncedSearchTerm.trim();

            if (trimmedTerm.length < 2) {
                setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
                return;
            }

            setIsSearching(true);
            setSearchError(null);

            try {
                const data = await searchService.search(trimmedTerm, cityId);
                setSearchResults(data.results || { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
            } catch (error: any) {
                console.error("Search error:", error);
                setSearchError(error.message || 'Failed to perform search');
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedSearchTerm, cityId]);

    const handleSearchTermChange = (newTerm: string) => {
        setSearchTerm(newTerm);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
    };

    return (
        <SearchContext.Provider value={{
            searchTerm,
            isSearching,
            searchResults,
            searchError,
            handleSearchTermChange,
            clearSearch
        }}>
            {children}
        </SearchContext.Provider>
    );
};
