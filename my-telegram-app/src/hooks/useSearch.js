// src/hooks/useSearch.js (DEFINITIVE CORRECTED VERSION)
import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { searchService } from '../services/searchService';
import { PAGINATION } from '../utils/constants';

export const useSearch = (cityId) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
    const [searchError, setSearchError] = useState(null);
    const [showResults, setShowResults] = useState(false); // The state variable is 'showResults'

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    console.log(`[useSearch.js] Hook re-running. Received cityId: ${cityId}, debouncedSearchTerm: '${debouncedSearchTerm}'`);

    useEffect(() => {
        const performSearch = async () => {
            const trimmedTerm = debouncedSearchTerm.trim();
            
            if (trimmedTerm.length < 2) {
                setShowResults(false);
                setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
                return;
            }
            
            if (!cityId) {   
                console.error('[useSearch.js] ABORTING SEARCH: The cityId is missing or invalid.', `(Value was: ${cityId})`);

                return;
            }
 console.log(`[useSearch.js] SUCCESS: Proceeding with search for '${trimmedTerm}' in city ${cityId}`);
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
        // FIX: Use the correct state setter function 'setShowResults'
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
        debouncedSearchTerm,
    };
};