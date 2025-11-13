// src/components/search/CompactSearchButton.jsx
import React from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"

const CompactSearchButton = ({ isVisible, onClick }) => {
  if (!isVisible) return null

  return (
    <motion.button
      key="compact-search-btn"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="h-10 w-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition-all border border-gray-200 shadow-sm"
    >
      <Search className="h-5 w-5 text-gray-600" />
    </motion.button>
  )
}

export default CompactSearchButton