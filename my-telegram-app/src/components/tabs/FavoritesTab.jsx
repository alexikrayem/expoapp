// src/components/tabs/FavoritesTab.jsx
import React from 'react';
import { Heart } from 'lucide-react';
import ProductCard from '../common/ProductCard';

const FavoritesTab = ({ favoriteProducts, isLoading, error, onAddToCart, onToggleFavorite, onShowDetails, favoriteProductIds }) => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><p>جاري تحميل المفضلة...</p></div>;
    }

    if (error) {
        return <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg text-center"><span className="font-medium">خطأ!</span> {error}</div>;
    }
  console.log('[DEBUG] Rendering FavoritesTab with products:', favoriteProducts);
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">المفضلة</h2>
            {favoriteProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {favoriteProducts.map(product => (
                        <ProductCard
                            key={`fav-prod-${product.id}`}
                            product={product}
                            onAddToCart={onAddToCart}
                            onToggleFavorite={onToggleFavorite}
                             onShowDetails={(id) => onShowDetails(id, 'favorites')}
                            isFavorite={favoriteProductIds.has(product.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-10">
                    <Heart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg">قائمة المفضلة فارغة.</p>
                    <p className="text-sm">أضف منتجات تعجبك بالضغط على أيقونة القلب!</p>
                </div>
            )}
        </div>
    );
};

export default FavoritesTab;