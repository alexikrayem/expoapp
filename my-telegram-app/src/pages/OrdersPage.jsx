// src/pages/OrdersPage.jsx (DEFINITIVE CORRECTED VERSION)
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import OrdersTab from '../components/tabs/OrdersTab';
import { orderService } from '../services/orderService';
import { motion } from 'framer-motion';

// This filter bar is self-contained. It has NO external imports and will not cause build errors.
const OrderFilterBar = ({ activeFilter, setActiveFilter }) => {
    const filters = [
        { key: 'all', label: 'الكل' },
        { key: 'pending', label: 'قيد الانتظار' },
        { key: 'completed', label: 'مكتملة' },
        { key: 'cancelled', label: 'ملغاة' },
    ];

    return (
        <div className="relative">
            <div className="flex items-center gap-3 overflow-x-auto p-2 scrollbar-hide">
                {filters.map(filter => {
                    const isSelected = activeFilter === filter.key;
                    return (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`
                                relative flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                                transition-colors duration-300 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                ${isSelected ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}
                            `}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="activeOrderStatusPill"
                                    className="absolute inset-0 bg-blue-600 rounded-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{filter.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


const OrdersPage = () => {
    const { telegramUser } = useOutletContext();
    const { orders, isLoadingOrders, ordersError, refetchOrders } = useOrders(telegramUser);

    const [activeFilter, setActiveFilter] = useState('all');
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(null);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        if (activeFilter === 'all') return orders;
        return orders.filter(order => order.status === activeFilter);
    }, [orders, activeFilter]);

    const handleCancelOrder = async (orderId) => {
        if (isUpdatingOrder || !window.confirm("هل أنت متأكد من أنك تريد إلغاء هذا الطلب؟")) return;
        
        setIsUpdatingOrder(orderId);
        try {
            await orderService.updateOrderStatus(orderId, 'cancelled');
            refetchOrders();
        } catch (error) {
            console.error("Failed to cancel order:", error);
            alert(`فشل في إلغاء الطلب: ${error.message}`);
        } finally {
            setIsUpdatingOrder(null);
        }
    };

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold text-gray-800">طلباتي</h1>
                <p className="text-gray-500 mt-1">عرض سجل طلباتك السابقة.</p>
            </header>

            <div className="my-4">
                <OrderFilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
            </div>

            <OrdersTab 
                orders={filteredOrders} 
                isLoading={isLoadingOrders} 
                error={ordersError}
                onCancelOrder={handleCancelOrder}
                updatingOrderId={isUpdatingOrder}
            />
        </div>
    );
};

export default OrdersPage;