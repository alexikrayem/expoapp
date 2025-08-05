// supplier-admin-panel/src/components/SupplierLayout.jsx
import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
// Import icons from lucide-react that your AdminPanel.jsx used for sidebar
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, ChevronDown, ChevronUp, Tag, AlertTriangle, Truck, Bell, Menu, X } from 'lucide-react'; 

const SupplierLayout = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo'));

    // Initialize Telegram Web App features
    React.useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            // Configure back button
            tg.BackButton.onClick(() => {
                if (window.location.pathname !== '/') {
                    navigate('/');
                } else {
                    tg.close();
                }
            });
            
            // Show back button on non-home pages
            if (window.location.pathname !== '/') {
                tg.BackButton.show();
            } else {
                tg.BackButton.hide();
            }
        }
    }, [navigate]);
    const handleLogout = () => {
        localStorage.removeItem('supplierToken');
        localStorage.removeItem('supplierInfo');
        
        // Close Telegram Web App if available
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.close();
        }
        
        navigate('/login');
    };

    // Navigation items - adapt from your AdminPanel.jsx's sidebar structure
    // For a supplier, they'd primarily see Dashboard, Products, Orders.
    const navItems = [
        { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/' },
        { name: 'المنتجات', icon: Package, path: '/products' },
        { name: 'عروضي', icon: Tag, path: '/my-deals' },
        { name: 'الطلبات', icon: ShoppingCart, path: '/orders' },
         { name: 'مندوبي التوصيل', icon: Truck, path: '/delivery-agents' }
        // { name: 'الإعدادات', icon: Settings, path: '/settings' }, // Maybe later
    ];

    return (
        <div className="flex h-screen bg-gray-100" dir="rtl">
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                fixed lg:static inset-y-0 right-0 z-50 w-64 bg-gray-800 text-gray-100 
                transform transition-transform duration-300 ease-in-out
                flex flex-col
            `}>
                <div className="p-4 space-y-4 flex-1">
                <div className="text-2xl font-bold text-center text-white py-4 border-b border-gray-700">
                    لوحة المورد
                </div>
                    
                    {/* Supplier info */}
                    <div className="bg-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-300">مرحباً،</p>
                        <p className="font-semibold text-white truncate">{supplierInfo?.name}</p>
                        <p className="text-xs text-gray-400">{supplierInfo?.category}</p>
                    </div>

                <nav className="flex-grow">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors mb-1"
                        >
                            <item.icon className="mr-3 h-5 w-5" /> {/* ml-3 for RTL */}
                            {item.name}
                        </Link>
                    ))}
                </nav>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full py-3 px-4 rounded-lg hover:bg-red-700 text-red-400 hover:text-white transition-colors mx-4"
                    >
                        <LogOut className="mr-3 h-5 w-5" /> {/* ml-3 for RTL */}
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden lg:mr-64">
                {/* Mobile header */}
                <header className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-gray-600 hover:text-gray-800"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800">لوحة المورد</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </header>
                
                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SupplierLayout;