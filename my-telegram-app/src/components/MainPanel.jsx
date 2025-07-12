// src/components/MainPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, X, MapPin } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// Import Custom Hooks and Services
import { useDebounce } from '../hooks/useDebounce';
import { useApi } from '../hooks/useApi';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { searchService } from '../services/searchService';
import { cityService } from '../services/cityService';
import { PAGINATION, SERVICEABLE_CITIES } from '../utils/constants';
import { formatPrice } from '../utils/formatters';
import { useProducts } from '../hooks/useProducts';
import { useFavorites } from '../hooks/useFavorites';
import { useSearch } from '../hooks/useSearch';
import { useCart } from '../hooks/useCart';
import { useDeals } from '../hooks/useDeals';
import { useSuppliers } from '../hooks/useSuppliers';
import { useOrders } from '../hooks/useOrders';

// Import Components
import FeaturedSlider from './FeaturedSlider';
import FeaturedSliderSkeleton from './FeaturedSliderSkeleton';
import ProductsTab from './tabs/ProductsTab';
import DealsTab from './tabs/DealsTab';
import SuppliersTab from './tabs/SuppliersTab';
import FavoritesTab from './tabs/FavoritesTab';
import OrdersTab from './tabs/OrdersTab';
import SearchResultsView from './search/SearchResultsView';
import CartSidebar from './cart/CartSidebar';
import MiniCartBar from './cart/MiniCartBar';
import AddressModal from './cart/AddressModal';
import ProductDetailModal from './modals/ProductDetailModal';
import DealDetailModal from './modals/DealDetailModal';
import SupplierDetailModal from './modals/SupplierDetailModal';
import OrderConfirmationModal from './modals/OrderConfirmationModal';
import CitySelectionModal from './modals/CitySelectionModal';
import CityChangePopover from './common/CityChangePopover';

const MainPanel = ({ telegramUser, userProfile, onProfileUpdate }) => {
    // =================================================================
    // 1. STATE MANAGEMENT
    // =================================================================

const {
    products,
    isLoadingProducts,
    productError,
    loadMoreProducts,
    hasMorePages,
    isLoadingMore,
    currentFilters,
    handleFiltersChange,
} = useProducts(userProfile?.selected_city_id);

    // --- Core UI State ---
    const [activeSection, setActiveSection] = useState('exhibitions');
    const [showCart, setShowCart] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState(false);

    // --- Search State ---
const {
    searchTerm,
    isSearching,
    searchResults,
    searchError,
    showSearchResults,
    handleSearchTermChange,
    clearSearch,
    debouncedSearchTerm,
} = useSearch(userProfile?.selected_city_id);

    // --- Cart State ---
   const {
    cartItems,
    isLoadingCart,
    cartError,
    isCartUpdating,
    actions: cartActions,
} = useCart(telegramUser);


    // --- Deals State ---
    const cityId = userProfile?.selected_city_id;
    const { deals, isLoadingDeals, dealError } = useDeals(activeSection === 'exhibitions' ? cityId : null);
const { suppliers, isLoadingSuppliers, supplierError } = useSuppliers(activeSection === 'suppliers' ? cityId : null);
const { orders, isLoadingOrders, ordersError, refetchOrders } = useOrders(activeSection === 'orders' ? telegramUser : null);
    // --- Suppliers State ---
   
    // --- Favorites State ---
     const { favoriteIds, toggleFavorite, isFavorite } = useFavorites(telegramUser);

    // --- Orders State ---
    const [highlightedOrderId, setHighlightedOrderId] = useState(null);
    
    // --- Featured Items State ---
    const [featuredItemsData, setFeaturedItemsData] = useState([]);
    const [isLoadingFeaturedItems, setIsLoadingFeaturedItems] = useState(true);
    const [featuredItemsError, setFeaturedItemsError] = useState(null);

    // --- Modal & Checkout State ---
    const [showProductDetailModal, setShowProductDetailModal] = useState(false);
    const [selectedProductDetails, setSelectedProductDetails] = useState(null);
    const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);
    const [productDetailError, setProductDetailError] = useState(null);

    const [showDealDetailModal, setShowDealDetailModal] = useState(false);
    const [selectedDealDetails, setSelectedDealDetails] = useState(null);
    const [isLoadingDealDetail, setIsLoadingDealDetail] = useState(false);
    const [dealDetailError, setDealDetailError] = useState(null);

    const [showSupplierDetailModal, setShowSupplierDetailModal] = useState(false);
    const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);
    const [isLoadingSupplierDetail, setIsLoadingSupplierDetail] = useState(false);
    const [supplierDetailError, setSupplierDetailError] = useState(null);

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [addressFormData, setAddressFormData] = useState({ fullName: '', phoneNumber: '', addressLine1: '', addressLine2: '', city: '' });
    
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
    const [confirmedOrderDetails, setConfirmedOrderDetails] = useState(null);
    const selectedCityId = userProfile?.selected_city_id;
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);

    // =================================================================
    // 2. DATA FETCHING & LOGIC (useEffect, useCallback, Handlers)
    // =================================================================



   

    useEffect(() => {
        const fetchFeaturedItems = async () => {
            setIsLoadingFeaturedItems(true);
            setFeaturedItemsError(null);
            setFeaturedItemsData([]);
            
            try {
                const data = await productService.getFeaturedItems();
                setFeaturedItemsData(data || []);
            } catch (error) {
                console.error("Failed to fetch featured items:", error);
                setFeaturedItemsError(error.message);
                setFeaturedItemsData([]);
            } finally {
                setIsLoadingFeaturedItems(false);
            }
        };

        fetchFeaturedItems();
    }, []);

    // --- Fetch Data on Tab Change ---
  
    


    useEffect(() => {
        const isAnyModalOpen =
            showProductDetailModal ||
            showDealDetailModal ||
            showSupplierDetailModal ||
            showAddressModal ||
            showOrderConfirmationModal ||
            showCart;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [
        showProductDetailModal,
        showDealDetailModal,
        showSupplierDetailModal,
        showAddressModal,
        showOrderConfirmationModal,
        showCart,
    ]); 

    useEffect(() => {
        const fetchFullFavoriteProducts = async () => {
            if (activeSection === 'favorites' && telegramUser?.id) {
                setIsLoadingFavoritesTab(true);
                setFavoritesTabError(null);
                setFetchedFavoriteProducts([]);
    
                if (userFavoriteProductIds.size === 0) {
                    console.log("No favorite product IDs to fetch details for.");
                    setIsLoadingFavoritesTab(false);
                    return;
                }
    
                try {
                    const idsString = Array.from(userFavoriteProductIds).join(',');
                    const productsData = await productService.getProductBatch(idsString);
                    setFetchedFavoriteProducts(productsData);
                } catch (error) {
                    console.error("Failed to fetch full favorite products:", error);
                    setFavoritesTabError(error.message);
                } finally {
                    setIsLoadingFavoritesTab(false);
                }
            }
        };
    
        fetchFullFavoriteProducts();
    }, [activeSection, telegramUser?.id, userFavoriteProductIds]);

    
   

   



    // --- Handler Functions ---
    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // --- NEW: Filter Handler ---
  
    const handleShowProductDetails = async (productId, context = 'default') => {
        if (!productId) return;

        setShowProductDetailModal(true);
        setIsLoadingProductDetail(true);
        setProductDetailError(null);
        setSelectedProductDetails(null);

        try {
            let data;
            if (context === 'favorites') {
                data = await productService.getFavoriteProductDetails(productId);
            } else {
                const product = await productService.getProduct(productId);
                data = {
                    originalProduct: product,
                    isAvailable: product.stock_level > 0,
                    alternatives: []
                };
            }
            setSelectedProductDetails(data);
        } catch (error) {
            console.error("Error fetching product details:", error);
            setProductDetailError(error.message);
        } finally {
            setIsLoadingProductDetail(false);
        }
    };

    const handleSelectAlternativeProduct = (productId) => {
        setShowProductDetailModal(false);
        setTimeout(() => {
            handleShowProductDetails(productId, 'default');
        }, 200);
    };

    const handleShowDealDetails = async (dealId) => {
        if (!dealId) return;

        setShowDealDetailModal(true);
        setIsLoadingDealDetail(true);
        setDealDetailError(null);
        setSelectedDealDetails(null);

        try {
            const data = await cityService.getDealDetails(dealId);
            setSelectedDealDetails(data);
        } catch (error) {
            console.error("Error fetching deal details:", error);
            setDealDetailError(error.message);
        } finally {
            setIsLoadingDealDetail(false);
        }
    };

    const handleShowSupplierDetails = async (supplierId) => {
        if (!supplierId) return;

        setShowSupplierDetailModal(true);
        setIsLoadingSupplierDetail(true);
        setSupplierDetailError(null);
        setSelectedSupplierDetails(null);

        try {
            const data = await cityService.getSupplierDetails(supplierId);
            setSelectedSupplierDetails(data);
        } catch (error) {
            console.error("Error fetching supplier details:", error);
            setSupplierDetailError(error.message);
        } finally {
            setIsLoadingSupplierDetail(false);
        }
    };

   

    

    const handleCheckout = async () => {
        if (!telegramUser?.id || cartItems.length === 0) {
            alert("User information not available or cart is empty.");
            return;
        }

        setShowAddressModal(false);
        setProfileError(null);

        if (userProfile && userProfile.full_name && userProfile.phone_number && userProfile.address_line1 && userProfile.city) {
            console.log("Profile is complete. Proceeding directly to create order.");
            await proceedToCreateOrder();
        } else {
            console.log("Profile is incomplete, showing address modal for completion.");
            setAddressFormData({
                fullName: userProfile?.full_name || `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                phoneNumber: userProfile?.phone_number || '',
                addressLine1: userProfile?.address_line1 || '',
                addressLine2: userProfile?.address_line2 || '',
                city: userProfile?.address_city_text || userProfile?.selected_city_name || '',
            });
            setShowAddressModal(true);
        }
    };
    const addToCart = (product) => {
    cartActions.addToCart(product);
    setActiveMiniCartItem({ ...product, quantity: 1 }); // Optimistically set quantity to 1
    setShowActiveItemControls(true);
};

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!telegramUser?.id) return;

        setIsPlacingOrder(true);
        setProfileError(null);

        try {
            await userService.updateProfile(telegramUser.id, addressFormData);
            onProfileUpdate();
            setShowAddressModal(false);
            await proceedToCreateOrder();
        } catch (error) {
            console.error("Error saving profile:", error);
            setProfileError(error.message);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const proceedToCreateOrder = async () => {
        if (!telegramUser?.id) {
            alert("Cannot create order: User information missing.");
            return;
        }
        if (cartItems.length === 0) {
            alert("Cannot create order: Your cart is empty.");
            return;
        }

        setIsPlacingOrder(true);

        try {
            const orderResult = await orderService.createOrder(telegramUser.id);
            console.log("Order created:", orderResult);
            setHighlightedOrderId(orderResult.orderId);
            setConfirmedOrderDetails(orderResult);
            refetchOrders();
            setShowOrderConfirmationModal(true);
            setCartItems([]);
            setShowCart(false);
        } catch (error) {
            console.error("Error creating order:", error);
            alert(`فشل في إنشاء الطلب: ${error.message}`);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleCityChange = async (city) => {
        if (!telegramUser || !city) return;
        try {
            await userService.updateProfile(telegramUser.id, { selected_city_id: city.id });
            onProfileUpdate();
        } catch (err) {
            console.error("Failed to change city:", err);
        }
    };

    const handleViewAllSupplierProducts = (supplierName) => {
        setShowSupplierDetailModal(false);
        setSearchTerm(supplierName);
    };

    // =================================================================
    // 3. RENDER METHOD
    // =================================================================
    return (
        <div className="min-h-screen bg-gray-50 overflow-y-auto h-full" dir="rtl">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm">
                <div className="p-4 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-800">معرض المستلزمات الطبية</h1>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => setIsCityPopoverOpen(prev => !prev)}
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors max-w-[160px]"
                                    title="Change City"
                                >
                                    <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                    <span className="truncate">
                                        {userProfile?.selected_city_name || 'اختر مدينة'}
                                    </span>
                                </button>
                                
                                <AnimatePresence>
                                    {isCityPopoverOpen && (
                                        <CityChangePopover
                                            apiBaseUrl={import.meta.env.VITE_API_BASE_URL}
                                            currentCityId={userProfile?.selected_city_id}
                                            onCitySelect={handleCityChange}
                                            onClose={() => setIsCityPopoverOpen(false)}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                            <button onClick={() => setShowCart(true)} className="relative p-2 text-gray-600 hover:text-blue-600">
                                <ShoppingCart className="h-6 w-6" />
                                {cartItems.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                                        {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="ابحث عن منتجات, عروض, أو موردين..."
                            value={searchTerm}
                            onChange={(e) => handleSearchTermChange(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        {searchTerm && (
                            <button onClick={clearSearch} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {!showSearchResults && (
                        <nav className="flex gap-2 border-b border-gray-200">
                            {['exhibitions', 'products', 'suppliers', 'favorites', 'orders'].map(section => (
                                <button key={section} onClick={() => setActiveSection(section)} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeSection === section ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {section === 'exhibitions' && 'العروض'}
                                    {section === 'products' && 'المنتجات'}
                                    {section === 'suppliers' && 'الموردون'}
                                    {section === 'favorites' && 'المفضلة'}
                                    {section === 'orders' && 'طلباتي'}
                                </button>
                            ))}
                        </nav>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 max-w-4xl mx-auto pb-32">
                {showSearchResultsView ? (
                    <SearchResultsView
                        searchTerm={debouncedSearchTerm}
                        isSearching={isSearching}
                        error={searchError}
                        results={searchResults}
                        onShowProductDetails={handleShowProductDetails}
                        onShowDealDetails={handleShowDealDetails}
                        onShowSupplierDetails={handleShowSupplierDetails}
                        onAddToCart={cartActions.addToCart}
                        onToggleFavorite={toggleFavorite}
                        userFavoriteProductIds={favoriteIds}
                    />
                ) : (
                    <>
                        {!showSearchResults && (
                            <div className="featured-container my-6">
                                {featuredItemsError ? (
                                    <div className="text-center py-10 text-red-500">
                                        <p>خطأ في تحميل العروض المميزة: {featuredItemsError}</p>
                                    </div>
                                ) : (
                                    <FeaturedSlider
                                        isLoading={isLoadingFeaturedItems}
                                        items={featuredItemsData}
                                        onSlideClick={(item) => {
                                            if (item.type === 'product' && item.id) handleShowProductDetails(item.id);
                                            else if (item.type === 'deal' && item.id) handleShowDealDetails(item.id);
                                            else if (item.type === 'supplier' && item.id) handleShowSupplierDetails(item.id);
                                        }}
                                    />
                                )}
                            </div>
                        )}                       
                        {activeSection === 'exhibitions' && <DealsTab deals={deals} isLoading={isLoadingDeals} error={dealError} onShowDetails={handleShowDealDetails} />}
                        {activeSection === 'products' && (
                          <ProductsTab 
    products={products}
    isLoading={isLoadingProducts} 
    error={productError} 
    onLoadMore={loadMoreProducts} 
    hasMorePages={hasMorePages} 
    isLoadingMore={isLoadingMore} 
    onAddToCart={cartActions.addToCart} 
    onToggleFavorite={toggleFavorite} // Assuming you also have useFavorites hook
    onShowDetails={handleShowProductDetails} 
    favoriteProductIds={favoriteIds} // Assuming you also have useFavorites hook
    selectedCityId={userProfile?.selected_city_id}
    onFiltersChange={handleFiltersChange}
    currentFilters={currentFilters}
/>
                        )}
                        {activeSection === 'suppliers' && <SuppliersTab suppliers={suppliers} isLoading={isLoadingSuppliers} error={supplierError} onShowDetails={handleShowSupplierDetails} />}
                        {activeSection === 'favorites' && <FavoritesTab favoriteProducts={fetchedFavoriteProducts} isLoading={isLoadingFavoritesTab} error={favoritesTabError} onAddToCart={cartActions.addToCart} onToggleFavorite={toggleFavorite} onShowDetails={handleShowProductDetails} favoriteProductIds={favoriteIds} />}
                        {activeSection === 'orders' && <OrdersTab orders={orders} isLoading={isLoadingOrdersTab} error={ordersTabError} highlightedOrderId={highlightedOrderId} />}
                    </>
                )}
            </main>

            {/* Overlays, Sidebars, and Modals with Unique Keys */}
            <AnimatePresence>
                {(cartItems.length > 0 || showActiveItemControls) && (
                    <MiniCartBar
                        key="mini-cart-bar"
                        cartItems={cartItems}
                        showActiveItemControls={showActiveItemControls}
                        activeMiniCartItem={activeMiniCartItem}
                        onIncrease={cartActions.increaseQuantity}
                        onDecrease={cartActions.decreaseQuantity}
                        onRemove={cartActions.removeItem}
                        onHideActiveItem={() => setShowActiveItemControls(false)}
                        onViewCart={() => {
                            setShowActiveItemControls(false);
                            setActiveMiniCartItem(null);
                            setShowCart(true);
                        }}
                    />
                )}
                
                {showCart && (
                    <CartSidebar
                        key="cart-sidebar"
                        show={showCart}
                        onClose={() => setShowCart(false)}
                        cartItems={cartItems}
                        isLoading={isLoadingCart}
                        error={cartError}
                        onIncrease={cartActions.increaseQuantity}
                        onDecrease={cartActions.decreaseQuantity}
                        onRemove={cartActions.removeItem}
                        onCheckout={handleCheckout}
                        isPlacingOrder={isPlacingOrder || isLoadingProfile}
                        pendingUpdate={isCartUpdating}
                    />
                )}
                
                {showAddressModal && (
                    <AddressModal
                        key="address-modal"
                        show={showAddressModal}
                        onClose={() => {
                            setShowAddressModal(false);
                            setIsPlacingOrder(false);
                        }}
                        formData={addressFormData}
                        onFormChange={handleAddressFormChange}
                        onFormSubmit={handleSaveProfile}
                        error={profileError}
                        isSaving={isPlacingOrder}
                        availableCities={SERVICEABLE_CITIES}
                    />
                )}
                
                {showProductDetailModal && (
                    <ProductDetailModal
                        key="product-detail-modal"
                        show={showProductDetailModal}
                        onClose={() => setShowProductDetailModal(false)}
                        productData={selectedProductDetails}
                        isLoading={isLoadingProductDetail}
                        error={productDetailError}
                        onAddToCart={cartActions.addToCart}
                        onToggleFavorite={{
                            toggle: toggleFavorite,
                            isFavorite:  (id) => userFavoriteProductIds.has(id)
                        }}
                        onSelectAlternative={handleSelectAlternativeProduct} 
                    />
                )}
                
                {showDealDetailModal && (
                    <DealDetailModal
                        key="deal-detail-modal"
                        show={showDealDetailModal}
                        onClose={() => setShowDealDetailModal(false)}
                        deal={selectedDealDetails}
                        isLoading={isLoadingDealDetail}
                        error={dealDetailError}
                        onProductClick={(id) => {
                            setShowDealDetailModal(false);
                            handleShowProductDetails(id);
                        }}
                    />
                )}
                
                {showSupplierDetailModal && (
                    <SupplierDetailModal
                        key="supplier-detail-modal"
                        show={showSupplierDetailModal}
                        onClose={() => setShowSupplierDetailModal(false)}
                        supplier={selectedSupplierDetails}
                        isLoading={isLoadingSupplierDetail}
                        error={supplierDetailError}
                        onProductClick={(id) => {
                            setShowSupplierDetailModal(false);
                            handleShowProductDetails(id);
                        }}
                        onViewAllProducts={handleViewAllSupplierProducts}
                        onAddToCart={cartActions.addToCart}
                        onToggleFavorite={toggleFavorite}
                        userFavoriteProductIds={favoriteIds}
                    />
                )}
                
                {showOrderConfirmationModal && (
                    <OrderConfirmationModal
                        key="order-confirmation-modal"
                        show={showOrderConfirmationModal}
                        onClose={() => {
                            setShowOrderConfirmationModal(false);
                            setActiveSection('orders');
                        }}
                        orderDetails={confirmedOrderDetails}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MainPanel;