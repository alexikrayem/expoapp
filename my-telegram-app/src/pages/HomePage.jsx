// src/pages/HomePage.jsx (FINAL CORRECTED VERSION)
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../context/ModalContext';

// Direct, explicit imports
import { useProducts } from '../hooks/useProducts';
import { useDeals } from '../hooks/useDeals';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSearch } from '../context/SearchContext';
import { useFavorites } from '../hooks/useFavorites';
import { useCart } from '../context/CartContext';
import { useFilters } from '../context/FilterContext';
import { productService } from '../services/productService';

// Components
import Header from '../components/layout/Header';
import FeaturedSlider from '../components/FeaturedSlider';
import ProductsTab from '../components/tabs/ProductsTab';
import DealsTab from '../components/tabs/DealsTab';
import SuppliersTab from '../components/tabs/SuppliersTab';
import SearchResultsView from '../components/search/SearchResultsView';

const HomePage = () => {
    // --- CONTEXT & GLOBAL DATA ---
    const { telegramUser, userProfile } = useOutletContext();
    const { openModal } = useModal();
    // FIX: Get the 'addToCart' action directly from the cart context.
    const { actions: { addToCart } } = useCart(); 
    const { favoriteIds, toggleFavorite } = useFavorites(telegramUser);
    const { searchResults, showSearchResults, isSearching, searchError, debouncedSearchTerm } = useSearch();
    const { currentFilters, handleFiltersChange } = useFilters();

    // --- LOCAL UI STATE ---
    const [activeSection, setActiveSection] = useState('products'); // Default to products

    // --- DATA FETCHING HOOKS ---
    const { products, isLoadingProducts, productError, loadMoreProducts, hasMorePages, isLoadingMore } = useProducts(userProfile?.selected_city_id);
    const { deals, isLoadingDeals, dealError } = useDeals(activeSection === 'exhibitions' ? userProfile?.selected_city_id : null);
    const { suppliers, isLoadingSuppliers, supplierError } = useSuppliers(activeSection === 'suppliers' ? userProfile?.selected_city_id : null);
    const [featuredItems, setFeaturedItems] = useState([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    useEffect(() => {
        const fetchFeatured = async () => {
            setIsLoadingFeatured(true);
            try {
                const data = await productService.getFeaturedItems();
                setFeaturedItems(data || []);
            } catch (err) {
                console.error("Failed to fetch featured items:", err);
            } finally {
                setIsLoadingFeatured(false);
            }
        };
        fetchFeatured();
    }, []);

    // --- HANDLER FUNCTIONS ---
    // The local 'addToCart' handler is now removed. We use the one from context directly.
    
    const handleShowProductDetails = (product) => {
        if (!product || !product.id) return;
        openModal('productDetail', {
            product: product,
            productId: product.id,
            onAddToCart: addToCart, // Pass the context's addToCart
            onToggleFavorite: { toggle: toggleFavorite, isFavorite: (id) => favoriteIds.has(id) },
        });
    };

    const handleShowDealDetails = (dealId) => {
        if (!dealId) return;
        openModal('dealDetail', { dealId });
    };

    const handleShowSupplierDetails = (supplierId) => {
        if (!supplierId) return;
        openModal('supplierDetail', { supplierId, onAddToCart: addToCart, onToggleFavorite: toggleFavorite, favoriteIds });
    };

    // --- RENDER METHOD ---
    return (
        <div className='pb-24'>
            <Header>
                {!showSearchResults && (
                    <nav className="flex gap-2 border-b border-gray-200">
                        {['exhibitions', 'products', 'suppliers'].map(section => (
                            <button key={section} onClick={() => setActiveSection(section)} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeSection === section ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                {section === 'exhibitions' && 'العروض'}
                                {section === 'products' && 'المنتجات'}
                                {section === 'suppliers' && 'الموردون'}
                            </button>
                        ))}
                    </nav>
                )}
            </Header>

            <main className="p-4 max-w-4xl mx-auto">
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
                        <div className="my-6">
                            <FeaturedSlider
                                isLoading={isLoadingFeatured}
                                items={featuredItems}
                                onSlideClick={(item) => {
                                    if (item.type === 'product') handleShowProductDetails(item);
                                    if (item.type === 'deal') handleShowDealDetails(item.id);
                                    if (item.type === 'supplier') handleShowSupplierDetails(item.id);
                                }}
                            />
                        </div>
                        {activeSection === 'exhibitions' && <DealsTab deals={deals} isLoading={isLoadingDeals} error={dealError} onShowDetails={handleShowDealDetails} />}
                        {activeSection === 'products' && (
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
                                onFiltersChange={handleFiltersChange}
                                currentFilters={currentFilters}
                                selectedCityId={userProfile?.selected_city_id}
                            />
                        )}
                        {activeSection === 'suppliers' && <SuppliersTab suppliers={suppliers} isLoading={isLoadingSuppliers} error={supplierError} onShowDetails={handleShowSupplierDetails} />}
                    </>
                )}
            </main>
        </div>
    );
};

export default HomePage;