// src/hooks/useSearch.js
import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce'; // Assuming you already have this hook
import { searchService } from '../services/searchService';
import { PAGINATION } from '../utils/constants';

export const useSearch = (cityId) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
    const [searchError, setSearchError] = useState(null);
    const [showResults, setShowResults] = useState(false);

    // Debounce the search term to avoid firing API calls on every keystroke
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        const performSearch = async () => {
            if (!cityId) return;

            const trimmedTerm = debouncedSearchTerm.trim();
            
            // Only search if the term is long enough
            if (trimmedTerm.length < 3) {
                setShowResults(false);
                setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
                return;
            }
            
            setIsSearching(true);
            setSearchError(null);
            setShowResults(true); // Show the results view as soon as we start searching
            
            try {
                const data = await searchService.search(trimmedTerm, cityId, PAGINATION.SEARCH_LIMIT);
                setSearchResults(data.results);
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

    return {
        searchTerm,
        isSearching,
        searchResults,
        searchError,
        showSearchResults: showResults,
        handleSearchTermChange,
        clearSearch,
        debouncedSearchTerm, // Exporting this is useful for the UI
    };
};