// supplier-admin-panel/src/components/SupplierLayout.jsx
import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
// Import icons from lucide-react that your AdminPanel.jsx used for sidebar
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, ChevronDown, ChevronUp, Tag, AlertTriangle, Truck } from 'lucide-react'; 

const SupplierLayout = () => {
    const navigate = useNavigate();
    const [openDropdown, setOpenDropdown] = useState(''); // To manage sidebar dropdowns if any

    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo'));

    const handleLogout = () => {
        localStorage.removeItem('supplierToken');
        localStorage.removeItem('supplierInfo');
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
            {/* Sidebar - Adapted from your AdminPanel.jsx style */}
            <aside className="w-64 bg-gray-800 text-gray-100 p-4 space-y-4 flex flex-col">
                <div className="text-2xl font-bold text-center text-white py-4 border-b border-gray-700">
                    لوحة المورد
                </div>
                <nav className="flex-grow">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors"
                        >
                            <item.icon className="mr-3 h-5 w-5" /> {/* ml-3 for RTL */}
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-gray-700 pt-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full py-2.5 px-4 rounded-md hover:bg-red-700 text-red-400 hover:text-white transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5" /> {/* ml-3 for RTL */}
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 overflow-y-auto">
                <header className="bg-white shadow-sm rounded-lg p-4 mb-6">
                     {/* You can add a header here, e.g., current page title or user info */}
                    <h1 className="text-xl font-semibold text-gray-700">
                        أهلاً بك، {supplierInfo?.name || 'المورد'}
                    </h1>
                </header>
                <Outlet /> {/* This is where routed components will render */}
            </main>
        </div>
    );
};

export default SupplierLayout;