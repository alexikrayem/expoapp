// src/pages/OrdersPage.jsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import OrdersTab from '../components/tabs/OrdersTab';

const OrdersPage = () => {
    const { telegramUser } = useOutletContext();
    const { orders, isLoadingOrders, ordersError } = useOrders(telegramUser);

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24">
            <header className="mb-6 mt-4">
                <h1 className="text-3xl font-bold text-gray-800">طلباتي</h1>
                <p className="text-gray-500 mt-1">عرض سجل طلباتك السابقة.</p>
            </header>
            <OrdersTab 
                orders={orders} 
                isLoading={isLoadingOrders} 
                error={ordersError} 
            />
        </div>
    );
};

export default OrdersPage;