"use client"

import React, { useEffect, useState, useRef } from "react"
import { Home, Heart, ListOrdered } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

// small throttle helper (kept for completeness, though not strictly needed here)
const throttle = (fn, wait = 100) => {
  let last = 0
  let timeout = null
  return (...args) => {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      last = now
      fn(...args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now()
        timeout = null
        fn(...args)
      }, remaining)
    }
  }
}

const Footer = () => {
  const location = useLocation()
  const activePath = location.pathname

  // State to track intersection with top and bottom sentinels
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)
  const bottomSentinelRef = useRef(null)

  // --- Core Logic: Dual Intersection Observer ---
  useEffect(() => {
    // 1. Get the TOP sentinel from the Header component using its ID
    const topSentinel = document.querySelector("#page-top-sentinel")
    // 2. Get the BOTTOM sentinel (local ref)
    const bottomSentinel = bottomSentinelRef.current

    if (!bottomSentinel || !topSentinel) {
      // This is a safe guard if the Header isn't rendered or the ID is missing
      console.warn("Footer observers could not find both sentinels. Ensure Header has #page-top-sentinel.")
      return
    }

    // Observer 1: Watches the TOP sentinel
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        // Sets to true if the top sentinel is visible (i.e., we are at the top)
        setIsAtTop(entry.isIntersecting)
      },
      { threshold: [0], rootMargin: "0px" },
    )

    // Observer 2: Watches the BOTTOM sentinel
    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        // Sets to true if the bottom sentinel is visible (i.e., we are at the bottom)
        setIsAtBottom(entry.isIntersecting)
      },
      { threshold: [0], rootMargin: "0px" },
    )

    topObserver.observe(topSentinel)
    bottomObserver.observe(bottomSentinel)

    return () => {
      // Cleanup observers
      if (topSentinel) topObserver.unobserve(topSentinel)
      if (bottomSentinel) bottomObserver.unobserve(bottomSentinel)
    }
  }, []) // Dependency array is empty to run once on mount

  // Reset state when route changes (to ensure expansion on new page load)
  useEffect(() => {
    setIsAtTop(true)
    setIsAtBottom(false)
  }, [location.pathname])

  // Logic to determine if the footer should be compact
  // It is compact ONLY if we are NOT at the top AND NOT at the bottom.
  const isCompact = !isAtTop && !isAtBottom

  const navItems = [
    { name: "home", path: "/", icon: Home, label: "الرئيسية" },
    { name: "favorites", path: "/favorites", icon: Heart, label: "المفضلة" },
    { name: "orders", path: "/orders", icon: ListOrdered, label: "طلباتي" },
  ]

  const handleNavClick = () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light")
    } catch (e) {
      // ignore if not available
    }
    // No need to manually set scroll state, the route change useEffect handles it.
  }

  return (
    <>
      {/* This is the BOTTOM sentinel element. It must be inside the scrollable container (e.g., your main app layout) and positioned at the very bottom of the content. */}
      <div
        ref={bottomSentinelRef}
        style={{ height: 0, visibility: "hidden" }}
        aria-hidden="true"
      />

      <motion.footer
        // Animate based on the new isCompact state
        animate={{
          height: isCompact ? 60 : 72,
        }}
        transition={{ duration: 0.3, type: "tween" }}
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 flex-shrink-0 bg-white/95 backdrop-blur-xl overflow-hidden"
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
                  className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 h-full relative ${isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
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
                    {!isCompact && ( // Use the isCompact variable
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
    </>
  )
}

export default Footer