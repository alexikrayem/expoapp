// src/components/tabs/OrdersTab.jsx (DEFINITIVE CORRECTED VERSION)
import React, { useEffect, useRef } from 'react';
import { ShoppingCart, XCircle, Loader2 } from 'lucide-react';

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
            case 'pending': return { text: 'قيد الانتظار', style: 'bg-yellow-100 text-yellow-800' };
            case 'completed': return { text: 'مكتملة', style: 'bg-green-100 text-green-800' };
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

    return (
        <div className="space-y-6">
            {orders.length > 0 ? (
                orders.map(order => {
                    const isHighlighted = order.id === highlightedOrderId;
                    const isBeingUpdated = updatingOrderId === order.id;
                    const canBeCancelled = order.status === 'pending';

                    return (
                        <div
                            ref={el => (orderRefs.current[order.id] = el)}
                            key={order.id}
                           className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500 ring-1 ring-black ring-opacity-5 ${isHighlighted ? 'highlight-order' : ''} ${isBeingUpdated ? 'opacity-70' : ''}`}
                        >
                            {/* --- FIX: Restored the top details section --- */}
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
                            
                            {/* --- FIX: Restored the middle items section --- */}
                            <div className="p-4 space-y-3">
                                <h4 className="text-md font-semibold text-gray-700">المنتجات:</h4>
                                {order.items && order.items[0]?.product_id !== null ? (
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

                            {/* --- The new actions footer --- */}
                            {canBeCancelled && (
                                <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-end">
                                    <button
                                        onClick={() => onCancelOrder(order.id)}
                                        disabled={isBeingUpdated}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isBeingUpdated ? (<><Loader2 className="h-4 w-4 animate-spin" />جاري الإلغاء...</>) : (<><XCircle className="h-4 w-4" />إلغاء الطلب</>)}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })
            ) : (
                <div className="text-center text-gray-500 py-10">
                    <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-lg">لا توجد لديك طلبات حتى الآن.</p>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;