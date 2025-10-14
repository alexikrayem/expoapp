"use client"
import { Outlet, useOutletContext } from "react-router-dom"
import { motion } from "framer-motion"
import Footer from "./Footer"
import FloatingUI from "./FloatingUI" // FIX: Import the new wrapper component

const AppLayout = () => {
  const context = useOutletContext() || {}

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <main className="flex-grow min-h-screen">
        <Outlet context={context} />
      </main>

      {/* 
              FIX: Render the FloatingUI component here. It will internally
              render the MiniCartBar with all the correct props.
            */}
      <FloatingUI />

      <Footer />
    </motion.div>
  )
}

export default AppLayout
