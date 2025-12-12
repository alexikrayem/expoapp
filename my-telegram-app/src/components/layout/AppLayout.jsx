"use client"
import { Outlet, useOutletContext, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Footer from "./Footer"
import Sidebar from "./Sidebar"
import FloatingUI from "./FloatingUI" // FIX: Import the new wrapper component

const AppLayout = () => {
  const context = useOutletContext() || {}
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:mr-64 relative min-h-screen transition-all duration-300">
        <main className="flex-grow pb-24 md:pb-8 pt-4 px-2 md:px-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet context={context} />
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
        <FloatingUI />
      </div>
    </div>
  )
}

export default AppLayout
