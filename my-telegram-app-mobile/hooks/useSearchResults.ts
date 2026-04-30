import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/searchService';
import { prefetchImages } from '@/utils/image';

export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_LIMIT = 10;

export interface SearchEntity {
    id?: string;
    name?: string | null;
    title?: string | null;
    description?: string | null;
    price?: number | string | null;
    effective_selling_price?: number | string | null;
    supplier_name?: string | null;
    supplier_id?: string | number | null;
    supplier_location?: string | null;
    category?: string | null;
    is_on_sale?: boolean | null;
    discount_price?: number | string | null;
    stock_quantity?: number | string | null;
    created_at?: string | null;
    rating?: number | string | null;
    image_url?: string | null;
    imageUrl?: string | null;
    image?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
    logo?: string | null;
    discountPercentage?: number | string | null;
    discount_percentage?: number | string | null;
    endDate?: string | null;
    end_date?: string | null;
    daysRemaining?: number | null;
    days_remaining?: number | null;
    city?: string | null;
    location?: string | null;
    [key: string]: unknown;
}

interface SearchResults {
    products: { items: SearchEntity[]; totalItems: number };
    deals: SearchEntity[];
    suppliers: SearchEntity[];
}

interface SearchApiResponse {
    results?: {
        products?: { items?: SearchEntity[]; totalItems?: number };
        deals?: SearchEntity[];
        suppliers?: SearchEntity[];
    };
}

const EMPTY_SEARCH_RESULTS: SearchResults = {
    products: { items: [], totalItems: 0 },
    deals: [],
    suppliers: []
};

const isSearchEntity = (value: SearchEntity | null): value is SearchEntity => value !== null;

const normalizeEntityId = (item: SearchEntity) => {
    if (item.id === undefined || item.id === null) return undefined;
    return String(item.id);
};

const normalizeImageUrl = (item: SearchEntity | null | undefined) => {
    if (!item) return null;
    const imageUrl = item.image_url || item.imageUrl || item.image || null;
    const normalizedId = normalizeEntityId(item);
    return {
        ...item,
        id: normalizedId,
        image_url: imageUrl,
        imageUrl: imageUrl,
    };
};

const normalizeDeal = (deal: SearchEntity | null | undefined) => {
    if (!deal) return null;
    const normalized = normalizeImageUrl(deal);
    if (!normalized) return null;

    const discountRaw = normalized.discountPercentage ?? normalized.discount_percentage;
    const discountValue =
        discountRaw === undefined || discountRaw === null || Number.isNaN(Number(discountRaw))
            ? 0
            : Number(discountRaw);

    const endDateValue = normalized.endDate || normalized.end_date;
    let daysRemaining = normalized.daysRemaining ?? normalized.days_remaining;
    if ((daysRemaining === undefined || daysRemaining === null) && endDateValue) {
        const endTimestamp = new Date(endDateValue).getTime();
        if (Number.isFinite(endTimestamp)) {
            const dayMs = 24 * 60 * 60 * 1000;
            daysRemaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / dayMs));
        }
    }

    return {
        ...normalized,
        discount_percentage: discountValue,
        discountPercentage: discountValue,
        daysRemaining: daysRemaining ?? 0,
    };
};

const normalizeSupplier = (supplier: SearchEntity | null | undefined) => {
    if (!supplier) return null;

    const logoUrl =
        supplier.logo_url || supplier.logoUrl || supplier.logo || supplier.image_url || supplier.imageUrl || null;

    return {
        ...supplier,
        logo_url: logoUrl,
        logoUrl: logoUrl,
        logo: logoUrl,
        city: supplier.city || supplier.location || null,
    };
};

const normalizeSearchResults = (payload: SearchApiResponse): SearchResults => {
    const rawResults = payload?.results || {};
    const rawProducts = rawResults.products || {};

    const products = (rawProducts.items || []).map(normalizeImageUrl).filter(isSearchEntity) as SearchEntity[];
    const deals = (rawResults.deals || []).map(normalizeDeal).filter(isSearchEntity) as SearchEntity[];
    const suppliers = (rawResults.suppliers || []).map(normalizeSupplier).filter(isSearchEntity) as SearchEntity[];

    return {
        products: {
            items: products,
            totalItems: Number(rawProducts.totalItems ?? products.length) || products.length,
        },
        deals,
        suppliers,
    };
};

export const useSearchResults = (searchTerm: string, cityId: string) => {
    const normalizedTerm = useMemo(() => searchTerm.trim().replace(/\s+/g, ' '), [searchTerm]);
    const normalizedKeyTerm = useMemo(() => normalizedTerm.toLowerCase(), [normalizedTerm]);
    const hasSearchQuery = normalizedTerm.length >= MIN_SEARCH_LENGTH;

    const searchQuery = useQuery({
        queryKey: ['search', cityId, normalizedKeyTerm],
        queryFn: ({ signal }) => searchService.search(normalizedTerm, cityId, SEARCH_LIMIT, { signal }),
        select: normalizeSearchResults,
        enabled: hasSearchQuery && !!cityId,
        staleTime: 1000 * 30, // 30 seconds
        gcTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        placeholderData: (previousData) => previousData,
    });

    const searchResults = searchQuery.data || EMPTY_SEARCH_RESULTS;

    useEffect(() => {
        if (!hasSearchQuery) return;

        const productUrls = searchResults.products?.items?.map((item) => item.image_url || item.imageUrl || item.image) || [];
        const dealUrls = searchResults.deals?.map((item) => item.image_url || item.imageUrl || item.image) || [];
        const supplierUrls = searchResults.suppliers?.map((item) => item.logoUrl || item.logo_url || item.logo) || [];
        prefetchImages([...productUrls, ...dealUrls, ...supplierUrls], 12);
    }, [hasSearchQuery, searchResults]);

    const searchError = useMemo(() => {
        const error = searchQuery.error as { name?: string; message?: string } | null;
        if (!error) return null;
        if (error.name === 'AbortError') return null;
        return error.message || 'Failed to perform search';
    }, [searchQuery.error]);

    const resultCounts = useMemo(() => ({
        products: searchResults.products?.totalItems || 0,
        deals: searchResults.deals?.length || 0,
        suppliers: searchResults.suppliers?.length || 0,
    }), [searchResults]);

    const hasAnyResults = useMemo(() => {
        return resultCounts.products > 0 || resultCounts.deals > 0 || resultCounts.suppliers > 0;
    }, [resultCounts]);

    return {
        searchResults,
        resultCounts,
        hasAnyResults,
        isSearching: searchQuery.isFetching && hasSearchQuery,
        searchError,
        hasSearchQuery,
    };
};
