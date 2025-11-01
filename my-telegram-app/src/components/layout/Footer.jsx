"use client"

import React, { useEffect, useState } from "react"
import { Home, Heart, ListOrdered } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

// small throttle helper
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
  const [isScrolled, setIsScrolled] = useState(false)

  // Use scroll position (not innerHeight) for compact mode so Telegram's viewport-resize
  // when focusing inputs doesn't flip the footer unexpectedly.
  useEffect(() => {
    // choose scroll element (document.scrollingElement is most reliable)
    const scrollEl = document.scrollingElement || document.documentElement

    const evaluateCompact = () => {
      // scrollTop from scrollEl (works if scrolling happens on an element)
      const scrollTop =
        (scrollEl && (scrollEl.scrollTop ?? scrollEl.scrollY ?? 0)) ||
        window.scrollY ||
        0

      // fallback for very narrow devices - use innerWidth, avoid innerHeight due to Telegram behaviour
      const narrowScreenFallback = window.innerWidth < 480

      // threshold: adjust >10 px as desired
      setIsScrolled(scrollTop > 10 || narrowScreenFallback)
    }

    const onScroll = throttle(evaluateCompact, 100)

    // Attach both to window and the scrolling element to be robust in different app setups
    window.addEventListener("scroll", onScroll, { passive: true })
    if (scrollEl && scrollEl !== document && scrollEl !== document.documentElement) {
      scrollEl.addEventListener("scroll", onScroll, { passive: true })
    }

    // evaluate once on mount
    evaluateCompact()

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (scrollEl && scrollEl !== document && scrollEl !== document.documentElement) {
        scrollEl.removeEventListener("scroll", onScroll)
      }
    }
  }, [])

  // Expand footer automatically when route changes
  useEffect(() => {
    setIsScrolled(false)
  }, [location.pathname])

  const navItems = [
    { name: "home", path: "/", icon: Home, label: "الرئيسية" },
    { name: "favorites", path: "/favorites", icon: Heart, label: "المفضلة" },
    { name: "orders", path: "/orders", icon: ListOrdered, label: "طلباتي" },
  ]

  const handleNavClick = () => {
    // Telegram light vibration feedback (safe-guarded)
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light")
    } catch (e) {
      // ignore if not available
    }
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
