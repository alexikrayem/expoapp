// src/components/tabs/OrdersTab.jsx - Enhanced with skeleton loading
import React, { useEffect, useRef } from 'react';
import { ShoppingCart, XCircle, Loader2, Package, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderCardSkeleton } from '../common/SkeletonLoader';

const OrdersTab = ({ orders, isLoading, error, highlightedOrderId, onCancelOrder, updatingOrderId }) => {
    const orderRefs = useRef({});
    
    useEffect(() => {
        if (highlightedOrderId && orders.length > 0) {
            const el = orderRefs.current[highlightedOrderId];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedOrderId, orders]);

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': 
                return { 
                    text: 'قيد الانتظار', 
                    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    icon: Clock
                };
            case 'completed': 
                return { 
                    text: 'مكتملة', 
                    style: 'bg-green-100 text-green-800 border-green-200',
                    icon: CheckCircle
                };
            case 'cancelled': 
                return { 
                    text: 'ملغى', 
                    style: 'bg-red-100 text-red-800 border-red-200',
                    icon: XCircle
                };
            default: 
                return { 
                    text: status, 
                    style: 'bg-gray-100 text-gray-800 border-gray-200',
                    icon: Package
                };
        }
    };

    if (error) {
        return (
            <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg text-center">
                <span className="font-medium">خطأ!</span> {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {Array.from({ length: 3 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <OrderCardSkeleton />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : orders.length > 0 ? (
                    <motion.div
                        key="orders"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {orders.map((order, index) => {
                            const isHighlighted = order.id === highlightedOrderId;
                            const isBeingUpdated = updatingOrderId === order.id;
                            const canBeCancelled = order.status === 'pending';
                            const statusInfo = getStatusInfo(order.status);

                            return (
                                <motion.div
                                    key={order.id}
                                    ref={el => (orderRefs.current[order.id] = el)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500 border ${
                                        isHighlighted ? 'ring-2 ring-blue-400 border-blue-200' : 'border-gray-200'
                                    } ${isBeingUpdated ? 'opacity-70' : ''}`}
                                >
                                    {/* Order header */}
                                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 border-b border-gray-200">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    طلب رقم: <span className="font-semibold text-gray-700">#{order.id}</span>
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    تاريخ الطلب: <span className="font-medium text-gray-700">
                                                        {new Date(order.order_date).toLocaleDateString('ar-EG', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <statusInfo.icon className="h-4 w-4" />
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.style}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-bold text-blue-600">
                                                    {parseFloat(order.total_amount).toFixed(2)} د.إ
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Order items */}
                                    <div className="p-4 space-y-3">
                                        <h4 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            المنتجات:
                                        </h4>
                                        {order.items && order.items[0]?.product_id !== null ? (
                                            <div className="space-y-2">
                                                {order.items.map((item, itemIndex) => (
                                                    <motion.div
                                                        key={item.product_id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: itemIndex * 0.05 }}
                                                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                                                    >
                                                        <div className="flex-1">
                                                            <span className="font-medium text-gray-800">{item.product_name}</span>
                                                            <span className="text-gray-500 text-sm"> × {item.quantity}</span>
                                                        </div>
                                                        <span className="font-semibold text-gray-700">
                                                            {parseFloat(item.price_at_time_of_order).toFixed(2)} د.إ
                                                        </span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">لا توجد تفاصيل للمنتجات.</p>
                                        )}
                                    </div>

                                    {/* Actions footer */}
                                    {canBeCancelled && (
                                        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onCancelOrder(order.id)}
                                                disabled={isBeingUpdated}
                                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait border border-red-200"
                                            >
                                                {isBeingUpdated ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        جاري الإلغاء...
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="h-4 w-4" />
                                                        إلغاء الطلب
                                                    </>
                                                )}
                                            </motion.button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center text-gray-500 py-16"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="mb-6"
                        >
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                <ShoppingCart className="h-12 w-12 text-blue-400" />
                            </div>
                        </motion.div>
                        <h3 className="text-xl font-semibold mb-2">لا توجد لديك طلبات حتى الآن</h3>
                        <p className="text-sm text-gray-400">ابدأ التسوق لتظهر طلباتك هنا</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrdersTab;