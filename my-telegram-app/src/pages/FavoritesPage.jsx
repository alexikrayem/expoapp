// src/pages/FavoritesPage.jsx (UPGRADED VERSION)
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { useFavoriteProducts } from '../hooks/useFavoriteProducts';
import { useModal } from '../context/ModalContext';
import { useCart } from '../hooks/useCart';
import FavoritesTab from '../components/tabs/FavoritesTab';
import ProductFilterBar from '../components/common/ProductFilterBar';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion for animation
import { Search, X } from 'lucide-react'; // Import icons

const FavoritesPage = () => {
    const { telegramUser, userProfile } = useOutletContext();
    const { openModal } = useModal();
    const { actions: cartActions } = useCart(telegramUser);

    const { favoriteIds, toggleFavorite } = useFavorites(telegramUser);
    const { favoriteProducts, isLoadingFavoritesTab, favoritesTabError } = useFavoriteProducts(favoriteIds, true);

    // --- STATE MANAGEMENT for this page ---
    const [localFilters, setLocalFilters] = useState({ category: 'all' });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [localSearchTerm, setLocalSearchTerm] = useState('');

    const handleFiltersChange = (newFilters) => {
        setLocalFilters(newFilters);
    };

    // --- CLIENT-SIDE FILTERING & SEARCHING LOGIC ---
    const filteredAndSearchedProducts = useMemo(() => {
        if (!favoriteProducts) return [];

        // 1. Apply category filter
        let filtered = localFilters.category === 'all'
            ? favoriteProducts
            : favoriteProducts.filter(p => p.category === localFilters.category);

        // 2. Apply search term filter
        const searchTerm = localSearchTerm.trim().toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm))
            );
        }

        return filtered;
    }, [favoriteProducts, localFilters.category, localSearchTerm]);

    // --- Handlers (unchanged) ---
    const handleShowProductDetails = (product) => { /* ... your existing logic ... */ };
    const addToCart = (product) => { /* ... your existing logic ... */ };

   return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
        <header className="mb-6 mt-4">
            <div className="flex justify-between items-center h-12"> {/* Set a fixed height for stability */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">المفضلة</h1>
                    <p className="text-gray-500 mt-1">المنتجات التي قمت بحفظها.</p>
                </div>
                
                {/* --- UPGRADED MORPHING SEARCH ANIMATION --- */}
               <div className="relative flex items-center justify-end h-full">
    <AnimatePresence>
        {isSearchOpen ? (
            // STATE 2: The Expanded Search Field
            <motion.div
                key="search-field-container"
                layoutId="search-morph"
                initial={{ width: '2.5rem' }}
                animate={{ width: '14rem' }} // sm:w-64
                exit={{ width: '2.5rem' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                // FIX: Added 'rounded-full' to the container div as well
                className="relative flex items-center h-10 bg-white border border-gray-300 shadow-sm rounded-full"
            >
                <motion.input
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    type="text"
                    placeholder="ابحث في المفضلة..."
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="w-full h-full pl-4 pr-10 bg-transparent rounded-full focus:outline-none"
                    autoFocus
                    onBlur={() => {
                        if (localSearchTerm === '') {
                            setIsSearchOpen(false);
                        }
                    }}
                />
                <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => {
                        setIsSearchOpen(false);
                        setLocalSearchTerm('');
                    }} 
                    className="absolute right-3 text-gray-400 hover:text-gray-600"
                >
                    <X className="h-4 w-4" />
                </motion.button>
            </motion.div>
        ) : (
            // STATE 1: The Circular Icon
            <motion.button
                key="search-icon-button"
                layoutId="search-morph"
                onClick={() => setIsSearchOpen(true)}
                // This 'rounded-full' was already correct, but we confirm it's here.
                className="z-10 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 focus:outline-none"
            >
                <Search className="h-5 w-5" />
            </motion.button>
        )}
    </AnimatePresence>
</div>
            </div>
        </header>
        
        <div className="my-4">
            <ProductFilterBar 
                currentFilters={localFilters}
                onFiltersChange={handleFiltersChange}
                selectedCityId={userProfile?.selected_city_id}
            />
        </div>

        <FavoritesTab 
            favoriteProducts={filteredAndSearchedProducts}
            isLoading={isLoadingFavoritesTab} 
            error={favoritesTabError} 
            onAddToCart={addToCart} 
            onToggleFavorite={toggleFavorite} 
            onShowDetails={handleShowProductDetails} 
            favoriteProductIds={favoriteIds} 
        />
    </div>
)};

export default FavoritesPage;