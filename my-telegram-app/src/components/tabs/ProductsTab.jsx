// src/components/tabs/ProductsTab.jsx - Enhanced with skeleton loading
import React, { useState, useEffect } from 'react';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../common/ProductCard';
import ProductFilterBar from '../common/ProductFilterBar';
import { ProductsGridSkeleton } from '../common/SkeletonLoader';

const ProductsTab = ({ 
    products, 
    isLoading, 
    error, 
    onLoadMore, 
    hasMorePages, 
    isLoadingMore, 
    onAddToCart, 
    onToggleFavorite, 
    onShowDetails, 
    favoriteProductIds,
    selectedCityId,
    onFiltersChange,
    currentFilters = {},
    refreshProducts
}) => {
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState({
        category: currentFilters.category || 'all',
        minPrice: currentFilters.minPrice || '',
        maxPrice: currentFilters.maxPrice || '',
        onSale: currentFilters.onSale || false,
        ...currentFilters
    });

    // Update local filters when current filters change
    useEffect(() => {
        setLocalFilters({
            category: currentFilters.category || 'all',
            minPrice: currentFilters.minPrice || '',
            maxPrice: currentFilters.maxPrice || '',
            onSale: currentFilters.onSale || false,
            ...currentFilters
        });
    }, [currentFilters]);

    const handleCategoryChange = (category) => {
        const newFilters = { ...localFilters, category };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const handleAdvancedFilterChange = (filterKey, value) => {
        const newFilters = { ...localFilters, [filterKey]: value };
        setLocalFilters(newFilters);
    };

    const applyAdvancedFilters = () => {
        onFiltersChange(localFilters);
        setShowAdvancedFilters(false);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    const clearAdvancedFilters = () => {
        const clearedFilters = {
            category: localFilters.category,
            minPrice: '',
            maxPrice: '',
            onSale: false
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
        setShowAdvancedFilters(false);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    const handleRefresh = () => {
        refreshProducts?.();
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    };

    const hasActiveAdvancedFilters = localFilters.minPrice || localFilters.maxPrice || localFilters.onSale;

    if (error) {
        return (
            <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg text-center">
                <span className="font-medium">خطأ!</span> {error}
                <button 
                    onClick={handleRefresh}
                    className="block mx-auto mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800">المنتجات المعروضة</h2>
                    {refreshProducts && (
                        <motion.button
                            whileHover={{ rotate: 180 }}
                            onClick={handleRefresh}
                            className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="تحديث"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </motion.button>
                    )}
                </div>
                <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasActiveAdvancedFilters || showAdvancedFilters
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <Filter className="h-4 w-4" />
                    فلاتر متقدمة
                    {hasActiveAdvancedFilters && (
                        <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            !
                        </span>
                    )}
                </button>
            </div>

            {/* Category Filter Bar */}
            <ProductFilterBar
                currentFilters={currentFilters}
                onFiltersChange={onFiltersChange}
                selectedCityId={selectedCityId}
            />

            {/* Advanced Filters Panel */}
            <AnimatePresence>
                {showAdvancedFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-4 space-y-4 overflow-hidden"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">فلاتر متقدمة</h3>
                            <button
                                onClick={() => setShowAdvancedFilters(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Price Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأدنى</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={localFilters.minPrice}
                                    onChange={(e) => handleAdvancedFilterChange('minPrice', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السعر الأعلى</label>
                                <input
                                    type="number"
                                    placeholder="1000"
                                    value={localFilters.maxPrice}
                                    onChange={(e) => handleAdvancedFilterChange('maxPrice', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* On Sale Filter */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="onSale"
                                    checked={localFilters.onSale}
                                    onChange={(e) => handleAdvancedFilterChange('onSale', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="onSale" className="mr-2 text-sm font-medium text-gray-700">
                                    المنتجات المخفضة فقط
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={applyAdvancedFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                تطبيق الفلاتر
                            </button>
                            <button
                                onClick={clearAdvancedFilters}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                            >
                                مسح الفلاتر
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Products Grid with skeleton loading */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <ProductsGridSkeleton count={6} />
                    </motion.div>
                ) : products.length > 0 ? (
                    <motion.div
                        key="products"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                    >
                        {products.map((product, index) => (
                            <motion.div
                                key={`tab-prod-${product.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ProductCard
                                    product={product}
                                    onAddToCart={onAddToCart}
                                    onToggleFavorite={onToggleFavorite}
                                    onShowDetails={onShowDetails}
                                    isFavorite={favoriteProductIds.has(product.id)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-gray-500 py-10"
                    >
                        <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-lg">لا توجد منتجات تطابق الفلاتر المحددة.</p>
                        <p className="text-sm">جرب تعديل الفلاتر أو البحث عن شيء آخر.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Load More Button */}
            {hasMorePages && !isLoadingMore && !isLoading && (
                <div className="text-center mt-8 mb-4">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLoadMore} 
                        className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg"
                    >
                        تحميل المزيد
                    </motion.button>
                </div>
            )}
            
            {isLoadingMore && (
                <div className="flex justify-center items-center h-20 mt-4">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <p className="text-gray-600">جاري تحميل المزيد...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsTab;