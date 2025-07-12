// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageSuppliersPage from './pages/ManageSuppliersPage';
import ManageFeaturedItemsPage from './pages/ManageFeaturedItemsPage';
// Import other placeholder pages you created
// import ProductsOverviewPage from './pages/ProductsOverviewPage';
// import DealsManagementPage from './pages/DealsManagementPage';
// import OrdersOverviewPage from './pages/OrdersOverviewPage';


const isAdminAuthenticated = () => {
    const token = localStorage.getItem('adminToken');
    // TODO: Add token validation/expiry check
    return !!token;
};

const ProtectedAdminRoutes = () => {
    const location = useLocation();
    if (!isAdminAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <AdminLayout />;
};

function App() {
    // Optional: Define basename if deploying to a subfolder like /admin
    // const basename = "/platform-admin"; 
    const basename = "/"; // Or just "/" if at root of its domain/subdomain

    return (
        <Router basename={basename}>
            <Routes>
                <Route path="/login" element={<AdminLoginPage />} />
                
                <Route element={<ProtectedAdminRoutes />}>
                    <Route path="/" element={<AdminDashboardPage />} />
                    <Route path="/suppliers" element={<ManageSuppliersPage />} />
                    <Route path="/featured-items" element={<ManageFeaturedItemsPage />} /> 
                    {/* <Route path="/products-overview" element={<ProductsOverviewPage />} /> */}
                    {/* <Route path="/deals-management" element={<DealsManagementPage />} /> */}
                    {/* <Route path="/orders-overview" element={<OrdersOverviewPage />} /> */}
                    {/* <Route path="/settings" element={<AdminSettingsPage />} /> */}
                </Route>
                
                <Route 
                    path="*" 
                    element={
                        <Navigate to={isAdminAuthenticated() ? "/" : "/login"} replace />
                    } 
                />
            </Routes>
        </Router>
    );
}
export default App;