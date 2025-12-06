// src/components/search/HeaderSearchButton.jsx
import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const HeaderSearchButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm text-gray-600 rounded-xl hover:bg-white transition-all border border-gray-200 shadow-sm"
    >
      <Search className="h-5 w-5" />
      <span className="text-sm font-medium">ابحث...</span>
    </motion.button>
  );
};

export default HeaderSearchButton;
