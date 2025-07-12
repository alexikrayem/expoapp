import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const OrderConfirmationModal = ({ onClose, orderDetails }) => {
    return (
        <motion.div
            key="orderConfirmationModal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-green-500 z-50 flex flex-col items-center justify-center p-4 text-white"
            dir="rtl"
        >
            <div className="text-center space-y-6 max-w-md">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="mx-auto bg-white rounded-full h-20 w-20 flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </motion.div>
                <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl font-bold">
                    تم استلام طلبك بنجاح!
                </motion.h2>
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-lg">
                    رقم طلبك هو: <span className="font-bold text-yellow-300">#{orderDetails.orderId}</span>
                </motion.p>
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-md">
                    سنتواصل معك قريباً لتأكيد تفاصيل التوصيل.
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                    <button onClick={onClose} className="mt-8 bg-white text-green-600 font-semibold px-8 py-3 rounded-lg shadow-md hover:bg-gray-100 text-lg">
                        حسنًا، فهمت!
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default OrderConfirmationModal;
