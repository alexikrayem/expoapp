// src/components/search/SearchResultsView.jsx (CORRECTED)
import React, { useState, useEffect } from 'react';
import { Search, Building2, DollarSign } from 'lucide-react';
import ProductCard from '../common/ProductCard';
import DealCard from '../common/DealCard';
import SupplierCard from '../common/SupplierCard';

// FIX #1: Changed prop name from 'userFavoriteProductIds' to 'favoriteIds'
const SearchResultsView = ({ searchTerm, isSearching, error, results, onShowProductDetails, onShowDealDetails, onShowSupplierDetails, onAddToCart, onToggleFavorite, favoriteIds }) => {
    
    const [sortOption, setSortOption] = useState('relevance');
    const [processedProducts, setProcessedProducts] = useState([]);

    useEffect(() => {
        const products = results.products?.items || [];
        // ... (your excellent sorting logic is unchanged) ...
        if (products.length === 0) {
            setProcessedProducts([]);
            return;
        }
        if (sortOption === 'supplier') {
            const groupedBySupplier = products.reduce((acc, product) => {
                const supplierName = product.supplier_name || 'Other';
                if (!acc[supplierName]) acc[supplierName] = [];
                acc[supplierName].push(product);
                return acc;
            }, {});
            const groupedArray = Object.entries(groupedBySupplier).map(([supplierName, products]) => ({ supplierName, products }));
            setProcessedProducts(groupedArray);
        } else if (sortOption === 'price_asc') {
            const sortedByPrice = [...products].sort((a, b) => parseFloat(a.effective_selling_price) - parseFloat(b.effective_selling_price));
            setProcessedProducts(sortedByPrice);
        } else {
            setProcessedProducts([...products]);
        }
    }, [results.products, sortOption]);

    if (isSearching) {
        return <p className="text-center text-gray-500 py-10">جاري البحث عن "{searchTerm}"...</p>;
    }
    if (error) {
        return <p className="text-center text-red-500 py-10">خطأ في البحث: {error}</p>;
    }
    const noResults = !results.products?.items?.length && !results.deals?.length && !results.suppliers?.length;
    if (noResults && searchTerm.trim().length >= 2) {
        return (
            <div className="text-center text-gray-500 py-10">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-lg">لا توجد نتائج لـ "{searchTerm}"</p>
                <p className="text-sm">جرب تعديل كلمة البحث.</p>
            </div>
        );
    }

    // --- Main render logic ---
    return (
        <div className="space-y-8 mt-4">
            {/* The product mapping logic */}
            {results.products?.items?.length > 0 && (
                <section>
                    {/* ... (your unchanged sort buttons) ... */}
                    {sortOption === 'supplier' ? (
                        <div className="space-y-6">
                            {processedProducts.map(group => (
                                <div key={group.supplierName}>
                                    <h4 className="text-md font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">{group.supplierName}</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {group.products.map(product => (
                                            <ProductCard 
                                                key={`grouped-prod-${product.id}`}
                                                product={product}
                                                onShowDetails={onShowProductDetails}
                                                onAddToCart={onAddToCart}
                                                onToggleFavorite={onToggleFavorite}
                                                // FIX #2: Use the new 'favoriteIds' prop
                                                isFavorite={favoriteIds.has(product.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {processedProducts.map(product => (
                                <ProductCard
                                    key={`flat-prod-${product.id}`}
                                    product={product}
                                    onShowDetails={onShowProductDetails}
                                    onAddToCart={onAddToCart}
                                    onToggleFavorite={onToggleFavorite}
                                    // FIX #3: Use the new 'favoriteIds' prop
                                    isFavorite={favoriteIds.has(product.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
            
            {results.deals?.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-1">العروض ({results.deals.length})</h3>
                    <div className="space-y-4 pt-2">
                        {results.deals.map(deal => (
                            <DealCard key={`search-deal-${deal.id}`} deal={deal} onShowDetails={onShowDealDetails} />
                        ))}
                    </div>
                </section>
            )}
            
            {results.suppliers?.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-1">الموردون ({results.suppliers.length})</h3>
                    <div className="space-y-4 pt-2">
                        {results.suppliers.map(supplier => (
                            <SupplierCard key={`search-supp-${supplier.id}`} supplier={supplier} onShowDetails={onShowSupplierDetails} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default SearchResultsView;