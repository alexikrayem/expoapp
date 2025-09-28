import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../context/ModalContext';
import { Tags, Package, Factory } from 'lucide-react';

// Direct, explicit imports
import { useProducts } from '../hooks/useProducts';
import { useDeals } from '../hooks/useDeals';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSearch } from '../context/SearchContext';
import { useFavorites } from '../hooks/useFavorites';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { useCache } from '../context/CacheContext';
import { productService } from "../services/productService";


import { motion, AnimatePresence } from 'framer-motion';

// Components
import Header from '../components/layout/Header';
import FeaturedSlider from '../components/FeaturedSlider';
import ProductsTab from '../components/tabs/ProductsTab';
import DealsTab from '../components/tabs/DealsTab';
import SuppliersTab from '../components/tabs/SuppliersTab';
import SearchResultsView from '../components/search/SearchResultsView';
import { HeaderSkeleton } from '../components/common/SkeletonLoader';

const HomePage = () => {
    // --- CONTEXT & GLOBAL DATA ---
    const { telegramUser, userProfile } = useOutletContext();
    const { openModal } = useModal();
    const { actions: { addToCart } } = useCart();
    const { favoriteIds, toggleFavorite } = useFavorites(telegramUser);
    const { searchResults, showSearchResults, isSearching, searchError, debouncedSearchTerm } = useSearch();
    const { currentFilters: globalFilters, handleFiltersChange: globalHandleFiltersChange } = useFilters();
    const { cachedApiCall } = useCache(); 
    
    // --- LOCAL UI STATE ---
    const [activeSection, setActiveSection] = useState('products');
    const [currentFilters, setCurrentFilters] = useState({
        category: 'all',
        minPrice: '',
        maxPrice: '',
        onSale: false,
    });

    // --- DATA FETCHING HOOKS ---
    // Pass currentFilters directly. useProducts will react to changes in this object.
    const { 
        products, isLoadingProducts, productError, loadMoreProducts, hasMorePages, 
        isLoadingMore, refreshProducts 
    } = useProducts(userProfile?.selected_city_id, currentFilters); // No `handleFiltersChange` from useProducts here

    const { deals, isLoadingDeals, dealError } = useDeals(activeSection === 'exhibitions' ? userProfile?.selected_city_id : null);
    const { suppliers, isLoadingSuppliers, supplierError } = useSuppliers(activeSection === 'suppliers' ? userProfile?.selected_city_id : null);
    const [featuredItems, setFeaturedItems] = useState([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    // Handle filter changes: This is the ONLY place in HomePage where currentFilters is updated.
    // This change will automatically trigger a refetch in useProducts via its useEffect.
    const handleLocalFiltersChange = (newFilters) => {
        setCurrentFilters(newFilters);
        // If you need to update a global FilterContext, keep this:
        globalHandleFiltersChange(newFilters); 
    };

    const tabs = [
        { id: 'exhibitions', label: 'العروض', icon: Tags },
        { id: 'products', label: 'المنتجات', icon: Package },
        { id: 'suppliers', label: 'الموردون', icon: Factory },
    ];

    useEffect(() => {
        const fetchFeatured = async () => {
            setIsLoadingFeatured(true);
            try {
                const data = await cachedApiCall(
                    'featured_items',
                    () => productService.getFeaturedItems(),
                    10 * 60 * 1000 // 10 minutes cache for featured items
                );
                setFeaturedItems(data || []);
            } catch (err) {
                console.error("Failed to fetch featured items:", err);
            } finally {
                setIsLoadingFeatured(false);
            }
        };
        fetchFeatured();
    }, [cachedApiCall]);

    // --- HANDLER FUNCTIONS ---
    
    const handleShowProductDetails = (product) => {
        if (!product || !product.id) return;
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        openModal('productDetail', {
            product: product,
            productId: product.id,
            onAddToCart: addToCart,
            onToggleFavorite: { toggle: toggleFavorite, isFavorite: (id) => favoriteIds.has(id) },
            onSelectAlternative: (alternativeId) => {
                // Close current modal and open alternative product
                handleShowProductDetails({ id: alternativeId });
            }
        });
    };

    const handleShowDealDetails = (dealId) => {
        if (!dealId) return;
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        openModal('dealDetail', { 
            dealId,
            onProductClick: (productId) => handleShowProductDetails({ id: productId }),
            onSupplierClick: (supplierId) => handleShowSupplierDetails(supplierId)
        });
    };

    const handleShowSupplierDetails = (supplierId) => {
        if (!supplierId) return;
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        openModal('supplierDetail', { 
            supplierId, 
            onAddToCart: addToCart, 
            onToggleFavorite: toggleFavorite, 
            favoriteIds 
        });
    };

    const handleSectionChange = (section) => {
        setActiveSection(section);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    // --- RENDER METHOD ---
    return (
        <div className='pb-24'>
            <Header>
                {!showSearchResults && (
                    <nav className="w-full flex justify-between gap-2 px-4 mt-4">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <motion.button
                                key={id}
                                onClick={() => handleSectionChange(id)}
                                whileTap={{ scale: 0.97 }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                                    ${
                                    activeSection === id
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={18} />
                                <span>{label}</span>
                            </motion.button>
                        ))}
                    </nav>
                )}
            </Header>

            <motion.main 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 max-w-4xl mx-auto"
            >
                {showSearchResults ? (
                    <SearchResultsView
                        searchTerm={debouncedSearchTerm}
                        isSearching={isSearching}
                        error={searchError}
                        results={searchResults}
                        onShowProductDetails={handleShowProductDetails}
                        onShowDealDetails={handleShowDealDetails}
                        onShowSupplierDetails={handleShowSupplierDetails}
                        onAddToCart={addToCart}
                        onToggleFavorite={toggleFavorite}
                        favoriteIds={favoriteIds}
                    />
                ) : (
                    <>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="my-6"
                        >
                            <FeaturedSlider
                                isLoading={isLoadingFeatured}
                                items={featuredItems}
                                onSlideClick={(item) => {
                                    if (item.type === 'product') handleShowProductDetails(item);
                                    if (item.type === 'deal') handleShowDealDetails(item.id);
                                    if (item.type === 'supplier') handleShowSupplierDetails(item.id);
                                }}
                            />
                        </motion.div>
                        
                        <AnimatePresence mode="wait">
                            {activeSection === 'exhibitions' && (
                                <motion.div
                                    key="exhibitions"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <DealsTab 
                                        deals={deals} 
                                        isLoading={isLoadingDeals} 
                                        error={dealError} 
                                        onShowDetails={handleShowDealDetails} 
                                    />
                                </motion.div>
                            )}
                            
                            {activeSection === 'products' && (
                                <motion.div
                                    key="products"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ProductsTab 
                                        products={products}
                                        isLoading={isLoadingProducts} 
                                        error={productError} 
                                        onLoadMore={loadMoreProducts} 
                                        hasMorePages={hasMorePages} 
                                        isLoadingMore={isLoadingMore} 
                                        onAddToCart={addToCart} 
                                        onToggleFavorite={toggleFavorite}
                                        onShowDetails={handleShowProductDetails} 
                                        favoriteProductIds={favoriteIds}
                                        onFiltersChange={handleLocalFiltersChange} // Pass the single filter handler
                                        currentFilters={currentFilters} // Pass currentFilters as prop
                                        selectedCityId={userProfile?.selected_city_id}
                                        refreshProducts={refreshProducts}
                                    />
                                </motion.div>
                            )}
                            
                            {activeSection === 'suppliers' && (
                                <motion.div
                                    key="suppliers"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <SuppliersTab 
                                        suppliers={suppliers} 
                                        isLoading={isLoadingSuppliers} 
                                        error={supplierError} 
                                        onShowDetails={handleShowSupplierDetails} 
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </motion.main>
        </div>
    );
};

export default HomePage;