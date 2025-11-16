import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { searchService } from '../services/searchService';
import { PAGINATION } from '../utils/constants'; // Will create this file

interface SearchResults {
  products: {
    items: any[];
    totalItems: number;
  };
  deals: any[];
  suppliers: any[];
}

interface SearchContextType {
  searchTerm: string;
  isSearching: boolean;
  searchResults: SearchResults;
  searchError: string | null;
  showSearchResults: boolean;
  handleSearchTermChange: (newTerm: string) => void;
  clearSearch: () => void;
  debouncedSearchTerm: string;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider: React.FC<{ children: React.ReactNode; cityId: string }> = ({ children, cityId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    products: { items: [], totalItems: 0 },
    deals: [],
    suppliers: []
  });
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Implement debounce logic manually
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

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
        const response = await searchService.search(trimmedTerm, cityId, PAGINATION.SEARCH_LIMIT);
        if (response.success) {
          setSearchResults(response.data.results || { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] });
        } else {
          throw new Error(response.error || 'Search failed');
        }
      } catch (error: any) {
        console.error("Search error:", error);
        setSearchError(error.message);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [debouncedSearchTerm, cityId]);

  const handleSearchTermChange = useCallback((newTerm: string) => {
    setSearchTerm(newTerm);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setShowResults(false);
  }, []);

  const value = {
    searchTerm,
    isSearching,
    searchResults,
    searchError,
    showSearchResults: showResults,
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