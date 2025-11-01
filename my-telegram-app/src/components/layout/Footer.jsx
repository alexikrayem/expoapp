"use client"

import React, { useEffect, useState } from "react"
import { Home, Heart, ListOrdered } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

const Footer = () => {
  const location = useLocation()
  const activePath = location.pathname
  const [isScrolled, setIsScrolled] = useState(false)

  // Detect screen size for compact mode instead of scroll position
  // This works better in Telegram Mini App
  useEffect(() => {
    const handleResize = () => {
      // Use window.innerHeight as it's more reliable in embedded Telegram view
      const isSmallViewport = window.innerHeight < 700
      setIsScrolled(isSmallViewport)
    }

    // Call immediately on mount
    handleResize()

    // Listen to resize and orientationchange
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
    }
  }, [])

  // 👇 Expand footer automatically when route changes
  useEffect(() => {
    setIsScrolled(false)
  }, [location.pathname])

  const navItems = [
    { name: "home", path: "/", icon: Home, label: "الرئيسية" },
    { name: "favorites", path: "/favorites", icon: Heart, label: "المفضلة" },
    { name: "orders", path: "/orders", icon: ListOrdered, label: "طلباتي" },
  ]

  const handleNavClick = () => {
    // Telegram light vibration feedback
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light")
    // Expand labels immediately on click
    setIsScrolled(false)
  }

  return (
    <motion.footer
      animate={{
        height: isScrolled ? 60 : 72,
      }}
      transition={{ duration: 0.3, type: "tween" }}
      className="fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 flex-shrink-0 bg-white/95 backdrop-blur-xl overflow-hidden"
    >
      <nav className="flex justify-around max-w-4xl mx-auto h-full mb-[env(safe-area-inset-bottom,16px)] py-2">
        {navItems.map((item) => {
          const isActive = activePath === item.path
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
                  isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
                }`}
              >
                {/* Icon with subtle highlight */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-full relative overflow-hidden"
                  style={{
                    background: isActive
                      ? "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.6))"
                      : "transparent",
                  }}
                >
                  {React.createElement(item.icon, {
                    className: "h-6 w-6",
                    fill: isActive ? "currentColor" : "none",
                  })}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
                        borderRadius: "9999px",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </motion.div>

                {/* Animate label visibility */}
                <AnimatePresence mode="wait">
                  {!isScrolled && (
                    <motion.span
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25 }}
                      className={`text-xs font-semibold ${isActive ? "text-blue-600" : "text-gray-500"}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          )
        })}
      </nav>
    </motion.footer>
  )
}

export default Footer
