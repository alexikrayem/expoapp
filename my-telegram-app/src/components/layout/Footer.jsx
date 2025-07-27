// src/components/layout/Footer.jsx
import React from 'react';
import { Home, Heart, ListOrdered } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
    const location = useLocation();
    // The current page path (e.g., "/", "/favorites", "/orders")
    const activePath = location.pathname;

    const navItems = [
        { name: 'home', path: '/', icon: Home, label: 'الرئيسية' },
        { name: 'favorites', path: '/favorites', icon: Heart, label: 'المفضلة' },
        { name: 'orders', path: '/orders', icon: ListOrdered, label: 'طلباتي' },
    ];

    return (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 flex-shrink-0 bg-white/90 backdrop-blur-lg">
            <nav className="flex justify-around max-w-4xl mx-auto h-16">
                {navItems.map(item => {
                    const isActive = activePath === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-1 transition-colors duration-200 ${
                                isActive 
                                    ? 'text-blue-600' 
                                    : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <item.icon 
                                className="h-6 w-6" 
                                fill={isActive ? 'currentColor' : 'none'} 
                            />
                            <span className="text-xs font-semibold">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </footer>
    );
};

export default Footer;