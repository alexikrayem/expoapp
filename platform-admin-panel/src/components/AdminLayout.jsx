// src/components/AdminLayout.jsx
import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, Tag, Settings, LogOut, FileText } from 'lucide-react'; // Added Users, Tag, FileText


const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation(); // To highlight active link
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        navigate('/login');
    };

    const navItems = [
        { name: 'لوحة التحكم', icon: LayoutDashboard, path: '/' },
        { name: 'إدارة الموردين', icon: Users, path: '/suppliers' },
        { name: 'إدارة المنتجات', icon: ShoppingBag, path: '/products-overview' }, // Overview of all products
        { name: 'إدارة العروض', icon: Tag, path: '/deals-management' }, // For featured_items and deals table
        { name: 'إدارة الطلبات', icon: FileText, path: '/orders-overview' }, // Overview of all orders
        { name: 'إدارة العروض المميزة', icon: Tag, path: '/featured-items' },
      { name: 'إدارة العروض المميزة لاوائح', icon: Tag, path: '/featured-lists' }
        // { name: 'الإعدادات', icon: Settings, path: '/settings' }, // For later
    ];

    return (
        <div className="flex h-screen bg-slate-100" dir="rtl">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 text-slate-100 p-4 space-y-6 flex flex-col shadow-lg">
                <div className="text-2xl font-bold text-center text-white py-4 border-b border-slate-700">
                    لوحة الأدمن
                </div>
                <nav className="flex-grow">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center py-3 px-4 my-1 rounded-lg hover:bg-slate-700 transition-colors duration-150 ease-in-out
                                        ${location.pathname === item.path ? 'bg-slate-700 font-semibold' : 'text-slate-300 hover:text-white'}`}
                        >
                            <item.icon className="ml-3 h-5 w-5" /> {/* mr-3 for LTR */}
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-slate-700 pt-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full py-3 px-4 rounded-lg hover:bg-red-700 text-red-400 hover:text-white transition-colors duration-150 ease-in-out"
                    >
                        <LogOut className="ml-3 h-5 w-5" /> {/* mr-3 for LTR */}
                        تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                <header className="bg-white shadow rounded-lg p-4 mb-6 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-700">
                        {/* Dynamic title based on route can be added later */}
                        {navItems.find(item => item.path === location.pathname)?.name || 'لوحة التحكم'}
                    </h1>
                    {adminInfo && <span className="text-sm text-gray-600">مرحباً، {adminInfo.name}</span>}
                </header>
                <div className="bg-white shadow rounded-lg p-6 min-h-[calc(100vh-10rem)]"> {/* Ensure content area has min height */}
                     <Outlet />
                </div>
            </main>
        </div>
    );
};
export default AdminLayout;