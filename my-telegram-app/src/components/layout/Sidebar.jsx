import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingBag, User, Settings, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const Sidebar = () => {
    const location = useLocation();
    const { cart } = useCart();
    const cartItemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

    const navItems = [
        { id: 'home', icon: Home, label: 'الرئيسية', path: '/' },
        { id: 'favorites', icon: Heart, label: 'المفضلة', path: '/favorites' },
        { id: 'orders', icon: ShoppingBag, label: 'طلباتي', path: '/orders' },
        { id: 'cart', icon: ShoppingCart, label: 'السلة', path: '/cart', badge: cartItemCount },
        { id: 'settings', icon: Settings, label: 'الإعدادات', path: '/settings' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 glass-sidebar fixed h-full z-20">
            <div className="p-6 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-2xl">🩺</span>
                </div>
                <span className="mr-3 font-bold text-lg text-white font-app-logo-text">Medical Expo</span>
            </div>

            <nav className="flex-1 flex flex-col gap-2 px-4 py-4 overflow-y-auto">
                {navItems.map(({ id, icon: Icon, label, path, badge }) => {
                    const isActive = location.pathname === path;

                    return (
                        <NavLink
                            key={id}
                            to={path}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                                    ? 'bg-white/20 text-white shadow-md font-bold backdrop-blur-md'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'}
              `}
                        >
                            <div className="relative">
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                {badge > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </div>
                            <span>{label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="glass-panel p-4 text-center">
                    <p className="text-xs text-white/50">Version 1.0.0</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
