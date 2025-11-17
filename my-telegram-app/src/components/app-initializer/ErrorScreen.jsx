import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';

const ErrorScreen = ({ error, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="p-4 bg-red-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
        <p className="text-gray-700 mb-5 leading-relaxed">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-full shadow hover:bg-blue-700 transition-all"
        >
          إعادة المحاولة
        </button>
      </motion.div>
    </div>
  );
};

export default ErrorScreen;