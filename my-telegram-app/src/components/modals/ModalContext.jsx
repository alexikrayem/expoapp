@@ .. @@
 // Import all the modals that this context will manage
 import ProductDetailModal from '../components/modals/ProductDetailModal';
 import DealDetailModal from '../components/modals/DealDetailModal';
 import SupplierDetailModal from '../components/modals/SupplierDetailModal';
 import ProfileModal from '../components/modals/ProfileModal';
 import AddressModal from '../components/cart/AddressModal';
 import OrderConfirmationModal from '../components/modals/OrderConfirmationModal';
+import CartSidebar from '../components/cart/CartSidebar';
 
 
 const ModalContext = createContext();
@@ .. @@
     const openModal = useCallback((type, props = {}) => {
          console.log(`[ModalContext.jsx] openModal called with type: "${type}"`, { props });
         document.body.style.overflow = 'hidden'; // Prevent background scrolling
         setModalState({ type, props });
+        
+        // Telegram haptic feedback
+        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
     }, []);
 
     const closeModal = useCallback(() => {
         document.body.style.overflow = 'auto'; // Restore background scrolling
         setModalState({ type: null, props: {} });
+        
+        // Telegram haptic feedback
+        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
     }, []);
 
     const renderModal = () => {