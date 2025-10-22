// src/components/layout/Footer.jsx
import React from 'react';
import { Home, Heart, ListOrdered } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Footer = () => {
  const location = useLocation();
  const activePath = location.pathname;

  const navItems = [
    { name: 'home', path: '/', icon: Home, label: 'الرئيسية' },
    { name: 'favorites', path: '/favorites', icon: Heart, label: 'المفضلة' },
    { name: 'orders', path: '/orders', icon: ListOrdered, label: 'طلباتي' },
  ];

  const handleNavClick = () => {
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 flex-shrink-0 bg-white/95 backdrop-blur-xl">
      <nav className="flex justify-around max-w-4xl mx-auto h-16 mb-[env(safe-area-inset-bottom,16px)] py-2">
        {navItems.map((item) => {
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
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full relative ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                {/* Pill-shaped gradient background */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-full relative overflow-hidden"
                  style={{
                    background: isActive
                      ? 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.6))'
                      : 'transparent',
                  }}
                >
                  <item.icon
                    className="h-6 w-6"
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
                        borderRadius: '9999px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </motion.div>

                <span
                  className={`text-xs font-semibold transition-all duration-200 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
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
