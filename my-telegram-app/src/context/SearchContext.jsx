// src/context/SearchContext.jsx (CORRECTED)
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { searchService } from '../services/searchService';
import { PAGINATION } from '../utils/constants';

const SearchContext = createContext();

export const useSearch = () => useContext(SearchContext);

export const SearchProvider = ({ children, cityId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
    const [searchError, setSearchError] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        const performSearch = async () => {
            const trimmedTerm = debouncedSearchTerm.trim();
            if (trimmedTerm.length < 2) {
                setShowResults(false);
                setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
                return;
            }
            if (!cityId) return;

            setIsSearching(true);
            setSearchError(null);
            setShowResults(true);
            try {
                const data = await searchService.search(trimmedTerm, cityId, PAGINATION.SEARCH_LIMIT);
                setSearchResults(data.results || { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
            } catch (error) {
                console.error("Search error:", error);
                setSearchError(error.message);
            } finally {
                setIsSearching(false);
            }
        };
        performSearch();
    }, [debouncedSearchTerm, cityId]);

    const handleSearchTermChange = (newTerm) => {
        setSearchTerm(newTerm);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setShowResults(false);
    };

    const value = {
        searchTerm,
        isSearching,
        searchResults,
        searchError,
        showSearchResults: showResults,
        isSearchPopoverOpen,
        setIsSearchPopoverOpen,
        handleSearchTermChange,
        clearSearch,
        debouncedSearchTerm,
    };

    return (
        <SearchContext.Provider value={value}>
            {children}
        </SearchContext.Provider>
    );
};