// src/components/layout/PreHeader.jsx
import React from "react"
import { motion } from "framer-motion"
import appLogoImage from "/src/assets/IMG_1787.png"

const PreHeader = () => {
  return (
    <motion.div className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2 mt-4">
      <img
        src={appLogoImage || "/placeholder.svg"}
        alt="App Logo"
        className="object-contain rounded-xl w-10 h-10 sm:w-12 sm:h-12 mt-6"
      />
      <div className="flex flex-col items-center text-center mt-6">
        <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">معرض طبيب</span>
        <span className="text-sm text-gray-500 leading-tight truncate">المستلزمات الطبية</span>
      </div>
    </motion.div>
  )
}

export default PreHeader