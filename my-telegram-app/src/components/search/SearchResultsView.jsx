// src/components/search/SearchResultsView.jsx
import React, { useState, useEffect } from 'react';
import { Search, Building2, DollarSign } from 'lucide-react'; // Import necessary icons
import ProductCard from '../common/ProductCard';
import DealCard from '../common/DealCard';
import SupplierCard from '../common/SupplierCard';

const SearchResultsView = ({ searchTerm, isSearching, error, results, onShowProductDetails, onShowDealDetails, onShowSupplierDetails, onAddToCart, onToggleFavorite, userFavoriteProductIds }) => {
    
    // =================================================================
    // HOOKS MUST BE CALLED AT THE TOP LEVEL, BEFORE ANY RETURNS
    // =================================================================
    const [sortOption, setSortOption] = useState('relevance'); // 'relevance', 'supplier', 'price_asc'
    const [processedProducts, setProcessedProducts] = useState([]);

    useEffect(() => {
        const products = results.products?.items || [];
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
            const sortedByPrice = [...products].sort((a, b) => a.effective_selling_price - b.effective_selling_price);
            setProcessedProducts(sortedByPrice);
        } else {
            setProcessedProducts([...products]);
        }
    }, [results.products, sortOption]);


    // --- Conditional returns can happen AFTER all hooks have been called ---
    if (isSearching) {
        return <p className="text-center text-gray-500 py-10">جاري البحث عن "{searchTerm}"...</p>;
    }
    if (error) {
        return <p className="text-center text-red-500 py-10">خطأ في البحث: {error}</p>;
    }

    const noResults = !results.products?.items?.length && !results.deals?.length && !results.suppliers?.length;

    if (noResults && searchTerm.trim().length >= 3) {
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
            {results.products?.items?.length > 0 && (
                <section>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex-shrink-0">
                            المنتجات ({results.products.totalItems})
                        </h3>
                        <div className="w-full sm:w-auto flex items-center justify-end gap-2 p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => setSortOption('relevance')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${sortOption === 'relevance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                الأكثر صلة
                            </button>
                            <button onClick={() => setSortOption('supplier')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${sortOption === 'supplier' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                <Building2 className="h-4 w-4" /> حسب المورد
                            </button>
                            <button onClick={() => setSortOption('price_asc')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${sortOption === 'price_asc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                <DollarSign className="h-4 w-4" /> الأقل سعراً
                            </button>
                        </div>
                    </div>

                   {sortOption === 'supplier' ? (
                    // --- RENDER GROUPED BY SUPPLIER ---
                    <div className="space-y-6">
                        {processedProducts.map(group => (
                            <div key={group.supplierName}>
                                <h4 className="text-md font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                                    {group.supplierName}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {/*
                                      ==========================================
                                      THE FIX IS HERE: Add a check to ensure
                                      group.products is an array before mapping.
                                      ==========================================
                                    */}
                                    {Array.isArray(group.products) && group.products.map(product => (
                                        <ProductCard 
                                            key={`grouped-prod-${product.id}`}
                                            product={product}
                                            onShowDetails={onShowProductDetails}
                                            onAddToCart={onAddToCart}
                                            onToggleFavorite={onToggleFavorite}
                                            isFavorite={userFavoriteProductIds.has(product.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // --- RENDER FLAT LIST (for relevance or price) ---
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {processedProducts.map(product => (
                            <ProductCard
                                key={`flat-prod-${product.id}`}
                                product={product}
                                onShowDetails={onShowProductDetails}
                                onAddToCart={onAddToCart}
                                onToggleFavorite={onToggleFavorite}
                                isFavorite={userFavoriteProductIds.has(product.id)}
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