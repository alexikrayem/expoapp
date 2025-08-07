// src/components/layout/Footer.jsx
import React from 'react';
import { Home, Heart, ListOrdered } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Footer = () => {
    const location = useLocation();
    // The current page path (e.g., "/", "/favorites", "/orders")
    const activePath = location.pathname;

    const navItems = [
        { name: 'home', path: '/', icon: Home, label: 'الرئيسية' },
        { name: 'favorites', path: '/favorites', icon: Heart, label: 'المفضلة' },
        { name: 'orders', path: '/orders', icon: ListOrdered, label: 'طلباتي' },
    ];

    const handleNavClick = () => {
        // Telegram haptic feedback
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    return (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 flex-shrink-0 bg-white/95 backdrop-blur-xl">
            <nav className="flex justify-around max-w-4xl mx-auto h-16">
                {navItems.map(item => {
                    const isActive = activePath === item.path;
                    return (
                        <motion.div
                            key={item.name}
                            className="flex-1 relative"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                to={item.path}
                                onClick={handleNavClick}
                                className={`flex flex-col items-center justify-center pt-2 pb-1 gap-1 transition-all duration-300 h-full relative ${
                                    isActive 
                                        ? 'text-blue-600' 
                                        : 'text-gray-500 hover:text-blue-500'
                                }`}
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                
                                <motion.div
                                    animate={{ 
                                        scale: isActive ? 1.1 : 1,
                                        y: isActive ? -2 : 0
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    <item.icon 
                                        className="h-6 w-6" 
                                        fill={isActive ? 'currentColor' : 'none'} 
                                    />
                                </motion.div>
                                
                                <span className={`text-xs font-semibold transition-all duration-200 ${
                                    isActive ? 'text-blue-600' : 'text-gray-500'
                                }`}>
                                    {item.label}
                                </span>
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>
        </footer>
    );
};

export default Footer;