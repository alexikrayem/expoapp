"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X, ZoomIn } from "lucide-react"

const ImageViewer = ({ isOpen, imageUrl, imageName, onClose }) => {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
          dir="rtl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image name */}
          {imageName && (
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <p className="font-semibold">{imageName}</p>
            </div>
          )}

          {/* Image */}
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            src={imageUrl}
            alt={imageName || "صورة بالحجم الكامل"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Zoom hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <ZoomIn className="h-4 w-4" />
            <span className="text-sm">اضغط خارج الصورة للإغلاق</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ImageViewer
