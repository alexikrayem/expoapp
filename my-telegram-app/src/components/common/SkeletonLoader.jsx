// src/components/common/SkeletonLoader.jsx - Reusable skeleton loading components
import React from 'react';
import { motion } from 'framer-motion';

// Base skeleton component
export const Skeleton = ({ className = '', width, height, rounded = true }) => (
    <div 
        className={`bg-gray-200 animate-pulse ${rounded ? 'rounded' : ''} ${className}`}
        style={{ width, height }}
    />
);

// Product card skeleton
export const ProductCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <Skeleton height="128px" className="w-full" />
        <div className="p-3 space-y-2">
            <Skeleton height="16px" className="w-full" />
            <Skeleton height="12px" className="w-2/3" />
            <div className="flex justify-between items-center pt-2">
                <Skeleton height="16px" className="w-1/3" />
                <Skeleton height="32px" width="32px" rounded={true} />
            </div>
        </div>
    </div>
);

// Products grid skeleton
export const ProductsGridSkeleton = ({ count = 6 }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
            >
                <ProductCardSkeleton />
            </motion.div>
        ))}
    </div>
);

// Deal card skeleton
export const DealCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <Skeleton height="144px" className="w-full" />
        <div className="p-4">
            <Skeleton height="20px" className="w-3/4 mb-2" />
            <Skeleton height="14px" className="w-full mb-1" />
            <Skeleton height="14px" className="w-2/3" />
        </div>
    </div>
);

// Supplier card skeleton
export const SupplierCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <Skeleton height="96px" className="w-full" />
        <div className="p-4 space-y-2">
            <Skeleton height="16px" className="w-2/3" />
            <Skeleton height="12px" className="w-1/2" />
            <Skeleton height="12px" className="w-3/4" />
        </div>
    </div>
);

// Featured slider skeleton
export const FeaturedSliderSkeleton = () => (
    <div className="w-full max-w-6xl mx-auto my-6 px-4">
        <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-shrink-0 w-80"
                >
                    <Skeleton height="300px" className="w-full rounded-xl" />
                </motion.div>
            ))}
        </div>
    </div>
);

// Header skeleton
export const HeaderSkeleton = () => (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
            <Skeleton height="40px" width="120px" />
            <Skeleton height="24px" width="150px" />
            <div className="flex gap-2">
                <Skeleton height="40px" width="40px" rounded={true} />
                <Skeleton height="40px" width="40px" rounded={true} />
                <Skeleton height="40px" width="40px" rounded={true} />
            </div>
        </div>
        <Skeleton height="48px" className="w-full rounded-2xl" />
    </div>
);

// Order card skeleton
export const OrderCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <Skeleton height="16px" width="120px" />
                    <Skeleton height="12px" width="100px" />
                </div>
                <div className="text-right space-y-2">
                    <Skeleton height="16px" width="80px" />
                    <Skeleton height="20px" width="60px" />
                </div>
            </div>
        </div>
        <div className="p-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                    <Skeleton height="14px" width="150px" />
                    <Skeleton height="14px" width="60px" />
                </div>
            ))}
        </div>
    </div>
);

// Page skeleton wrapper
export const PageSkeleton = ({ children, isLoading, fallback }) => {
    if (isLoading) {
        return fallback || <div className="p-4">{children}</div>;
    }
    return children;
};