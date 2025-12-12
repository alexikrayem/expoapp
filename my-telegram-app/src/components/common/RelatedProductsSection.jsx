import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ProductCard from '../common/ProductCard';

const RelatedProductsSection = ({
    title,
    products,
    onProductClick,
    onAddToCart,
    onToggleFavorite,
    favoriteIds
}) => {
    const scrollContainerRef = React.useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 300;
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('right')}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <button
                        onClick={() => scroll('left')}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x"
                style={{ scrollBehavior: 'smooth' }}
            >
                {products.map(product => (
                    <div key={product.id} className="min-w-[200px] w-[200px] md:min-w-[220px] md:w-[220px] snap-start">
                        <ProductCard
                            product={product}
                            onShowDetails={() => onProductClick(product.id)} // Adapt to ProductCard prop
                            onAddToCart={onAddToCart}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={favoriteIds && favoriteIds.has(product.id)}
                            compact={true} // Hint for smaller card style if supported, or just resizing via container
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RelatedProductsSection;
