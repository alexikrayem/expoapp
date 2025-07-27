// src/components/search/SearchResultsView.jsx (ANIMATED VERSION)
import React, { useState, useEffect } from 'react';
import { Search, Building2, DollarSign, Tag, ShoppingBag } from 'lucide-react';
// Step 1: Import motion and AnimatePresence from Framer Motion
import { motion, AnimatePresence } from 'framer-motion'; 
import ProductCard from '../common/ProductCard';
import DealCard from '../common/DealCard';
import SupplierCard from '../common/SupplierCard';

const SearchResultsView = ({ searchTerm, isSearching, error, results, onShowProductDetails, onShowDealDetails, onShowSupplierDetails, onAddToCart, onToggleFavorite, favoriteIds }) => {
    
    // --- STATE MANAGEMENT --- (Unchanged)
    const [activeTab, setActiveTab] = useState('products');
    const [sortOption, setSortOption] = useState('relevance');
    const [processedProducts, setProcessedProducts] = useState([]);

    // --- EFFECT TO PROCESS PRODUCTS FOR SORTING --- (Unchanged)
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
            const sortedByPrice = [...products].sort((a, b) => parseFloat(a.effective_selling_price) - parseFloat(b.effective_selling_price));
            setProcessedProducts(sortedByPrice);
        } else {
            setProcessedProducts([...products]);
        }
    }, [results.products, sortOption]);
    
    // --- EFFECT TO AUTO-SELECT A TAB --- (Unchanged)
    useEffect(() => {
        if (results.products?.items?.length === 0) {
            if (results.deals?.length > 0) setActiveTab('deals');
            else if (results.suppliers?.length > 0) setActiveTab('suppliers');
            else setActiveTab('products');
        } else {
            setActiveTab('products');
        }
    }, [results]);


    // --- LOADING & ERROR STATES --- (Unchanged)
    if (isSearching) return <p className="text-center text-gray-500 py-10">جاري البحث عن "{searchTerm}"...</p>;
    if (error) return <p className="text-center text-red-500 py-10">خطأ في البحث: {error}</p>;
    const noResults = !results.products?.items?.length && !results.deals?.length && !results.suppliers?.length;
    if (noResults && searchTerm.trim().length >= 2) return (
        <div className="text-center text-gray-500 py-10">
            <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-lg">لا توجد نتائج لـ "{searchTerm}"</p>
            <p className="text-sm">جرب تعديل كلمة البحث.</p>
        </div>
    );
    
    // --- RENDER HELPER FOR TAB CONTENT ---
    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'products':
                return (
                    // This fragment is the parent for the animated content
                    <>
                        {/* Sort buttons are unchanged */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex-shrink-0">
                                نتائج المنتجات ({results.products.totalItems})
                            </h3>
                            <div className="w-full sm:w-auto flex items-center justify-end gap-2 p-1 bg-gray-100 rounded-lg">
                                <button onClick={() => setSortOption('relevance')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${sortOption === 'relevance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>الأكثر صلة</button>
                                <button onClick={() => setSortOption('supplier')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${sortOption === 'supplier' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}><Building2 className="h-4 w-4" /> حسب المورد</button>
                                <button onClick={() => setSortOption('price_asc')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${sortOption === 'price_asc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}><DollarSign className="h-4 w-4" /> الأقل سعراً</button>
                            </div>
                        </div>

                        {/* Step 2: Wrap the animated sections in AnimatePresence for fade transitions */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={sortOption} // This key is crucial for swapping between views
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {sortOption === 'supplier' ? (
                                    <div className="space-y-6">
                                        {processedProducts.map(group => (
                                            <div key={group.supplierName}>
                                                <h4 className="text-md font-bold text-gray-700 mb-3 pb-2 border-b border-gray-200">{group.supplierName}</h4>
                                                {/* Step 3: Add motion.div with 'layout' to the grid */}
                                                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {Array.isArray(group.products) && group.products.map(product => (
                                                        // Step 4: Wrap each card in its own motion.div for individual animation
                                                        <motion.div key={product.id} layout>
                                                            <ProductCard product={product} onShowDetails={onShowProductDetails} onAddToCart={onAddToCart} onToggleFavorite={onToggleFavorite} isFavorite={favoriteIds.has(product.id)} />
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Step 3 (repeated): Add motion.div with 'layout' to the flat grid
                                    <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {processedProducts.map(product => (
                                            // Step 4 (repeated): Wrap each card for individual animation
                                            <motion.div key={product.id} layout>
                                                <ProductCard product={product} onShowDetails={onShowProductDetails} onAddToCart={onAddToCart} onToggleFavorite={onToggleFavorite} isFavorite={favoriteIds.has(product.id)} />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </>
                );
            case 'deals':
                // (This section remains unchanged)
                return (
                    <div className="space-y-4 pt-2">
                        {results.deals.map(deal => <DealCard key={`search-deal-${deal.id}`} deal={deal} onShowDetails={onShowDealDetails} />)}
                    </div>
                );
            case 'suppliers':
                // (This section remains unchanged)
                return (
                    <div className="space-y-4 pt-2">
                        {results.suppliers.map(supplier => <SupplierCard key={`search-supp-${supplier.id}`} supplier={supplier} onShowDetails={onShowSupplierDetails} />)}
                    </div>
                );
            default:
                return null;
        }
    };
    
    // --- MAIN RENDER LOGIC --- (Unchanged)
    return (
        <div className="space-y-4 mt-4">
            {/* TABS NAVIGATION */}
            <nav className="flex gap-2 border-b border-gray-200">
                {results.products?.items?.length > 0 && <button onClick={() => setActiveTab('products')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'products' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><ShoppingBag className="h-4 w-4" /> المنتجات ({results.products.totalItems})</button>}
                {results.deals?.length > 0 && <button onClick={() => setActiveTab('deals')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'deals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Tag className="h-4 w-4" />العروض ذات الصلة ({results.deals.length})</button>}
                {results.suppliers?.length > 0 && <button onClick={() => setActiveTab('suppliers')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === 'suppliers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Building2 className="h-4 w-4" /> الموردون ({results.suppliers.length})</button>}
            </nav>

            {/* TAB CONTENT */}
            <div className="pt-4">
                {renderActiveTabContent()}
            </div>
        </div>
    );
};

export default SearchResultsView;