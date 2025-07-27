// src/components/common/ProductFilterBar.jsx (CORRECTED LOGIC + ENHANCED DESIGN)
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { productService } from '../../services/productService';

const ProductFilterBar = ({ currentFilters, onFiltersChange, selectedCityId }) => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const scrollContainerRef = useRef(null);

    // This useEffect fetches the categories data, same as before.
    useEffect(() => {
        const fetchCategories = async () => {
            if (!selectedCityId) return;
            setIsLoading(true);
            setError(null);
            try {
                const data = await productService.getProductCategories(selectedCityId);
                // Prepend the 'All' category
                setCategories([{ category: 'all', product_count: null }, ...(data.categories || [])]);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
                setError('فشل في تحميل الفئات');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategories();
    }, [selectedCityId]);

    // This is the corrected handler function.
    const handleCategoryClick = (category) => {
        if (currentFilters.category === category) return; // Prevent re-clicking the same category
        onFiltersChange({ ...currentFilters, category: category });
    };

    // --- RENDER LOGIC ---

    if (isLoading) {
        // Enhanced Skeleton Loader
        return (
            <div className="flex space-x-3 space-x-reverse overflow-hidden p-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-4 text-red-500">{error}</div>;
    }

    return (
        <div className="relative">
            <div
                ref={scrollContainerRef}
                className="flex items-center gap-3 overflow-x-auto p-2 scrollbar-hide"
            >
                {categories.map((cat) => {
                    const isSelected = currentFilters.category === cat.category;
                    const displayName = cat.category === 'all' ? 'الكل' : cat.category;
                    const count = cat.product_count ? `(${cat.product_count})` : '';

                    return (
                        <button
                            key={cat.category}
                            onClick={() => handleCategoryClick(cat.category)}
                            className={`
                                relative flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                                transition-colors duration-300 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                ${isSelected ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}
                            `}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="activeCategory" // This is the magic for the sliding animation
                                    className="absolute inset-0 bg-blue-600 rounded-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{displayName} {count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ProductFilterBar;