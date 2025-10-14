"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Phone, Home, MapPin, Loader2, Save, Camera, Mail } from "lucide-react"

const ProfileModal = ({ show, onClose, formData, onFormSubmit, error, isSaving }) => {
  const [localFormData, setLocalFormData] = useState(formData)

  useEffect(() => {
    if (show) {
      console.log("[v0] ProfileModal opened with formData:", formData)
      setLocalFormData(formData)
    }
  }, [show, formData])

  if (!show) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    console.log("[v0] Input changed:", name, "=", value)
    setLocalFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("[v0] Profile form submitted with data:", localFormData)
    onFormSubmit(e, localFormData)
  }

  const handleClose = () => {
    console.log("[v0] Closing profile modal")
    onClose()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-50 overflow-y-auto"
          dir="rtl"
        >
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm"
          >
            <div className="flex justify-between items-center p-4 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                الملف الشخصي
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </motion.button>
            </div>
          </motion.div>

          {/* Content */}
          <div className="max-w-2xl mx-auto p-4 pb-24">
            {/* Profile Avatar Section */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center mb-8 mt-6"
            >
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl"
                >
                  <User className="h-14 w-14 text-white" />
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border-2 border-blue-500"
                >
                  <Camera className="h-4 w-4 text-blue-600" />
                </motion.button>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-gray-500 text-sm"
              >
                قم بتحديث معلوماتك الشخصية
              </motion.p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="أدخل اسمك الكامل"
                    value={localFormData.fullName || ""}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </motion.div>

              {/* Phone Number */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="05xxxxxxxx"
                    value={localFormData.phoneNumber || ""}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </motion.div>

              {/* Address Line 1 */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان</label>
                <div className="relative">
                  <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <input
                    type="text"
                    name="addressLine1"
                    placeholder="الشارع، المبنى، رقم الشقة"
                    value={localFormData.addressLine1 || ""}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </motion.div>

              {/* Address Line 2 (Optional) */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل إضافية (اختياري)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <input
                    type="text"
                    name="addressLine2"
                    placeholder="معلومات إضافية عن العنوان"
                    value={localFormData.addressLine2 || ""}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </motion.div>

              {/* City */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">المدينة</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <input
                    type="text"
                    name="city"
                    placeholder="اسم المدينة"
                    value={localFormData.city || ""}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white shadow-sm hover:shadow-md"
                  />
                </div>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl"
                  >
                    <p className="text-sm text-red-600 text-center font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="pt-4"
              >
                <motion.button
                  type="submit"
                  disabled={isSaving}
                  whileHover={{ scale: isSaving ? 1 : 1.02 }}
                  whileTap={{ scale: isSaving ? 1 : 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>حفظ التغييرات</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100"
            >
              <p className="text-sm text-blue-800 text-center">معلوماتك الشخصية محمية ومشفرة بالكامل</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProfileModal
