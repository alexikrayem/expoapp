// src/components/common/ProductFilterBar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { productService } from '../../services/productService';

const ProductFilterBar = ({ selectedCategory, onCategoryChange, selectedCityId }) => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!selectedCityId) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                const data = await productService.getProductCategories(selectedCityId);
                setCategories(data.categories || []);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
                setError('فشل في تحميل الفئات');
                setCategories([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [selectedCityId]);

    if (isLoading) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-4 text-red-500 text-sm">
                {error}
            </div>
        );
    }

    const allCategories = [
        { category: 'all', product_count: 'الكل' },
        ...categories
    ];

    return (
        <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {allCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.category || (selectedCategory === 'all' && cat.category === 'all');
                    const displayName = cat.category === 'all' ? 'الكل' : cat.category;
                    const count = cat.category === 'all' ? '' : ` (${cat.product_count})`;
                    
                    return (
                        <button
                            key={cat.category}
                            onClick={() => onCategoryChange(cat.category)}
                            className={`
                                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-in-out
                                ${isSelected 
                                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                                }
                                whitespace-nowrap min-w-fit
                            `}
                        >
                            {displayName}{count}
                        </button>
                    );
                })}
            </div>
            
            {/* Scroll indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white pointer-events-none opacity-50"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-transparent to-white pointer-events-none opacity-50"></div>
        </div>
    );
};

export default ProductFilterBar;