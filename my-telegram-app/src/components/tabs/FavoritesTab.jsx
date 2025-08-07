// src/components/tabs/FavoritesTab.jsx - Enhanced with skeleton loading
import React from 'react';
import { Heart, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../common/ProductCard';
import { ProductsGridSkeleton } from '../common/SkeletonLoader';

const FavoritesTab = ({ favoriteProducts, isLoading, error, onAddToCart, onToggleFavorite, onShowDetails, favoriteProductIds }) => {
    if (error) {
        return (
            <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg text-center">
                <span className="font-medium">خطأ!</span> {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <Heart className="h-6 w-6 text-red-500" />
                    المفضلة
                </h2>
                {favoriteProducts.length > 0 && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {favoriteProducts.length} منتج
                    </span>
                )}
            </div>

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
                ) : favoriteProducts.length > 0 ? (
                    <motion.div
                        key="favorites"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                    >
                        {favoriteProducts.map((product, index) => (
                            <motion.div
                                key={`fav-prod-${product.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ProductCard
                                    product={product}
                                    onAddToCart={onAddToCart}
                                    onToggleFavorite={onToggleFavorite}
                                    onShowDetails={(product) => onShowDetails(product, 'favorites')}
                                    isFavorite={favoriteProductIds.has(product.id)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center text-gray-500 py-16"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="mb-6"
                        >
                            <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                <Heart className="h-12 w-12 text-red-400" />
                            </div>
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2">قائمة المفضلة فارغة</h3>
                        <p className="text-sm text-gray-400 max-w-sm mx-auto">
                            أضف منتجات تعجبك بالضغط على أيقونة القلب لتجدها هنا!
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FavoritesTab;