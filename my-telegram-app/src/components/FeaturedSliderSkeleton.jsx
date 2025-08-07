// src/components/FeaturedSliderSkeleton.jsx - Skeleton for featured slider
import React from 'react';
import { motion } from 'framer-motion';

const FeaturedSliderSkeleton = () => {
    return (
        <div className="w-full max-w-6xl mx-auto my-6 px-4">
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex-shrink-0 w-80 h-[280px] bg-gray-200 rounded-xl animate-pulse relative overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                        
                        {/* Content placeholder */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                            <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default FeaturedSliderSkeleton;