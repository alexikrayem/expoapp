// src/components/tabs/OrdersTab.jsx
import React, { useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';

const OrdersTab = ({ orders, isLoading, error, highlightedOrderId }) => {
    const orderRefs = useRef({});
    
    useEffect(() => {
        if (highlightedOrderId && orders.length > 0) {
            const highlightedOrderElement = orderRefs.current[highlightedOrderId];
            
            if (highlightedOrderElement) {
                // Scroll the element into view with a smooth behavior
                highlightedOrderElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center', // Aligns the element to the center of the viewport
                });
            }
        }
    }, [highlightedOrderId, orders]);

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending': return { text: 'قيد الانتظار', style: 'bg-yellow-100 text-yellow-800' };
            case 'confirmed': return { text: 'مؤكد', style: 'bg-blue-100 text-blue-800' };
            case 'shipped': return { text: 'تم الشحن', style: 'bg-indigo-100 text-indigo-800' };
            case 'delivered': return { text: 'تم التوصيل', style: 'bg-green-100 text-green-800' };
            case 'cancelled': return { text: 'ملغى', style: 'bg-red-100 text-red-800' };
            default: return { text: status, style: 'bg-gray-100 text-gray-800' };
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><p>جاري تحميل الطلبات...</p></div>;
    }

    if (error) {
        return <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg text-center"><span className="font-medium">خطأ!</span> {error}</div>;
    }
console.log('[DEBUG] Rendering OrdersTab with orders:', orders);
    return (
        <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">طلباتي</h2>
            {orders.length > 0 ? (
                orders.map(order => {
                    const isHighlighted = order.id === highlightedOrderId;
                    return (
                        <div
                            // Assign a ref to each order div using its ID
                            ref={el => (orderRefs.current[order.id] = el)}
                            key={order.id}
                            // Apply the highlight class conditionally
                            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500 ${isHighlighted ? 'highlight-order' : ''}`}
                        >
                            <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <p className="text-sm text-gray-500">طلب رقم: <span className="font-semibold text-gray-700">#{order.id}</span></p>
                                    <p className="text-sm text-gray-500">تاريخ الطلب: <span className="font-medium text-gray-700">{new Date(order.order_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">الحالة: <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(order.status).style}`}>{getStatusInfo(order.status).text}</span></p>
                                    <p className="text-lg font-bold text-blue-600 mt-1">{parseFloat(order.total_amount).toFixed(2)} د.إ</p>
                                </div>
                            </div>
                        <div className="p-4 space-y-3">
                            <h4 className="text-md font-semibold text-gray-700">المنتجات:</h4>
                            {order.items?.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {order.items.map(item => (
                                        <li key={item.product_id} className="flex justify-between items-center pb-1 border-b border-gray-100 last:border-b-0">
                                            <span>{item.product_name} <span className="text-gray-500">(x{item.quantity})</span></span>
                                            <span className="font-medium text-gray-600">{parseFloat(item.price_at_time_of_order).toFixed(2)} د.إ</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (<p className="text-sm text-gray-500">لا توجد تفاصيل للمنتجات.</p>)}
                        </div>
                    </div>
                      )
                })
            ) : (
                <div className="text-center text-gray-500 py-10">
                    <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg">لا توجد لديك طلبات حتى الآن.</p>
                    <p className="text-sm">ابدأ التسوق لإضافة أول طلب لك!</p>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;