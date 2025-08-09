// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SupplierLayout from './components/SupplierLayout'; // Import the layout
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import MyDealsPage from './pages/MyDealsPage';
import ManageDeliveryAgentsPage from './pages/ManageDeliveryAgentsPage';

// Telegram Web App initialization
const initializeTelegramWebApp = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        
        // Set theme colors for supplier panel
        tg.setHeaderColor('#1f2937'); // gray-800
        tg.setBackgroundColor('#f9fafb'); // gray-50
        
        
        
        console.log('Telegram Web App initialized for supplier panel');
    }
};


// Helper to check authentication status
const isAuthenticated = () => {
    const token = localStorage.getItem('supplierToken');
    // TODO: Add token validation/expiry check here for more security
    return !!token;
};

// Component for protected routes
const ProtectedRoutes = () => {
    const isAuth = isAuthenticated();
    const currentPath = useLocation(); // Get current location using the hook

    if (!isAuth) {
        // --- MODIFIED LINE ---
        // Pass only serializable parts of the location object
        return <Navigate 
                    to="/login" 
                    state={{ from: { 
                        pathname: currentPath.pathname, 
                        search: currentPath.search,
                        hash: currentPath.hash 
                        // Or more simply, if you only need pathname:
                        // from: currentPath.pathname 
                    }}} 
                    replace 
                />;
    }
    return <SupplierLayout />;
};

function App() {
    // Initialize Telegram Web App on mount
    React.useEffect(() => {
        initializeTelegramWebApp();
    }, []);

    return (
        <Router basename="/"> {/* Updated for root deployment */}
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes are nested within the ProtectedRoutes element */}
                <Route element={<ProtectedRoutes />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                     <Route path="/my-deals" element={<MyDealsPage />} /> 
                    <Route path="/orders" element={<OrdersPage />} />
                     <Route path="/delivery-agents" element={<ManageDeliveryAgentsPage />} />
                
                    {/* Add other supplier-specific routes here, e.g., /settings */}
                </Route>
                
                {/* Fallback: If no other route matches, redirect based on auth status */}
                <Route 
                    path="*" 
                    element={
                        <Navigate to={isAuthenticated() ? "/" : "/login"} replace />
                    } 
                />
            </Routes>
        </Router>
    );
}

export default App;