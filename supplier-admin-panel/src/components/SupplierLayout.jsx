import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Tag,
    Truck,
    Menu,
    X
} from 'lucide-react';

const SupplierLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo'));

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.BackButton.onClick(() => {
                if (window.location.pathname !== '/') {
                    navigate('/');
                } else {
                    tg.close();
                }
            });

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

        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.close();
        }

        navigate('/login');
    };

    const navItems = [
        { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/' },
        { name: 'المنتجات', icon: Package, path: '/products' },
        { name: 'عروضي', icon: Tag, path: '/my-deals' },
        { name: 'الطلبات', icon: ShoppingCart, path: '/orders' },
        { name: 'مندوبي التوصيل', icon: Truck, path: '/delivery-agents' }
    ];

    const isActiveRoute = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile */}
            <aside className={`
                fixed top-0 right-0 h-full z-50
                w-72 bg-gradient-to-b from-indigo-600 to-purple-700 text-white
                transform transition-transform duration-300 ease-in-out
                md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
                flex flex-col shadow-2xl
            `}>
                {/* Sidebar Header */}
                <div className="p-6 border-b border-white/20">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold">لوحة المورد</h1>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Supplier info card */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-sm text-white/70 mb-1">مرحباً،</p>
                        <p className="font-semibold text-lg truncate">{supplierInfo?.name || 'المورد'}</p>
                        {supplierInfo?.category && (
                            <p className="text-xs text-white/60 mt-1">{supplierInfo.category}</p>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = isActiveRoute(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                    flex items-center gap-3 py-3 px-4 rounded-xl
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-white text-indigo-600 shadow-lg font-semibold'
                                        : 'hover:bg-white/10 text-white'
                                    }
                                `}
                            >
                                <item.icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout button */}
                <div className="p-4 border-t border-white/20">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden md:mr-72">
                {/* Mobile header */}
                <header className="md:hidden bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between p-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-800">لوحة المورد</h1>
                        <div className="w-10" />
                    </div>
                </header>

                {/* Desktop header */}
                <header className="hidden md:block bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between px-8 py-4">
                        <h1 className="text-2xl font-bold text-gray-800">
                            {navItems.find(item => isActiveRoute(item.path))?.name || 'لوحة التحكم'}
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">مرحباً،</p>
                                <p className="font-semibold text-gray-800">{supplierInfo?.name || 'المورد'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content area with proper scrolling */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SupplierLayout;
