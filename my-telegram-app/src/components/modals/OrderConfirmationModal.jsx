import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Package, MapPin, Phone, User, ArrowRight } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

const OrderConfirmationModal = ({ show, onClose, orderDetails, customerInfo }) => {
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (show) {
            // Telegram haptic feedback
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
            
            // Auto-close after 8 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 8000);
            
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-green-500 to-emerald-600 z-50 flex flex-col items-center justify-center p-4 text-white"
            dir="rtl"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-center space-y-6 max-w-md w-full"
            >
                {/* Success Icon */}
                <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="mx-auto bg-white rounded-full h-24 w-24 flex items-center justify-center shadow-2xl"
                >
                    <CheckCircle className="h-14 w-14 text-green-500" />
                </motion.div>

                {/* Success Message */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                >
                    <h2 className="text-3xl font-bold">
                        تم استلام طلبك بنجاح! 🎉
                    </h2>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-lg font-semibold">
                            رقم طلبك: <span className="text-yellow-300">#{orderDetails.orderId}</span>
                        </p>
                    </div>
                </motion.div>

                {/* Order Summary */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3"
                >
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        ملخص الطلب
                    </h3>
                    
                    {customerInfo && (
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{customerInfo.fullName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{customerInfo.phoneNumber}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5" />
                                <div>
                                    <p>{customerInfo.addressLine1}</p>
                                    {customerInfo.addressLine2 && (
                                        <p className="text-white/80">{customerInfo.addressLine2}</p>
                                    )}
                                    <p className="font-medium">{customerInfo.city}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Next Steps */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-4"
                >
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <h4 className="font-semibold mb-2">الخطوات التالية:</h4>
                        <div className="space-y-2 text-sm text-left" dir="ltr">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                                <span>سنتواصل معك لتأكيد الطلب</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                                <span>سيتم تحضير طلبك</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                                <span>التوصيل إلى عنوانك</span>
                            </div>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="w-full bg-white text-green-600 font-bold py-4 rounded-xl shadow-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        متابعة التسوق
                        <ArrowRight className="h-5 w-5" />
                    </motion.button>
                </motion.div>

                {/* Auto-close indicator */}
                <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 8, ease: "linear" }}
                    className="h-1 bg-white/30 rounded-full overflow-hidden"
                >
                    <div className="h-full bg-white rounded-full"></div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default OrderConfirmationModal;