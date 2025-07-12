// src/pages/OrderItemDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api'; // Your configured axios instance
import { ArrowRight, Package, User, Phone, MapPin, Edit3, CheckCircle, XCircle, Truck, AlertTriangle, Landmark } from 'lucide-react'; // Import necessary icons

const OrderItemDetailPage = () => {
    const { orderItemId } = useParams(); // Get orderItemId from URL
    const location = useLocation();
    const navigate = useNavigate();

    // Initial item and order details are passed via route state
    const initialItemDetails = location.state?.itemDetails;
    const initialOrderContext = location.state?.orderContext;

    const [item, setItem] = useState(initialItemDetails);
    const [order, setOrder] = useState(initialOrderContext);
    
    const [isLoading, setIsLoading] = useState(false); // For status update action
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // If initial details are not passed, or to refresh, you could fetch them
    // For now, we'll rely on the passed state.
    useEffect(() => {
        if (!initialItemDetails || !initialOrderContext) {
            // This shouldn't happen if linked correctly, but good to handle
            console.warn("Item or order details not passed to OrderItemDetailPage. Navigating back.");
            // navigate(-1); // Go back
        }
        // Set page title or other initial actions
        window.Telegram?.WebApp?.BackButton.show();
        const handleBackButtonClick = () => navigate(-1); // Navigate back
        window.Telegram?.WebApp?.onEvent('backButtonClicked', handleBackButtonClick);
        
        return () => {
            window.Telegram?.WebApp?.BackButton.hide();
            window.Telegram?.WebApp?.offEvent('backButtonClicked', handleBackButtonClick);
        };
    }, [initialItemDetails, initialOrderContext, navigate]);


    const handleStatusUpdate = async (newStatus, notes = '', paymentCollected = undefined) => {
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const payload = { newStatus };
            if (notes.trim()) payload.notes = notes.trim();
            if (paymentCollected !== undefined) payload.paymentCollected = Boolean(paymentCollected);

            const response = await apiClient.put(`/api/delivery/order-items/${orderItemId}/status`, payload);
            setItem(response.data); // Update local item state with response from backend
            setSuccessMessage(`تم تحديث حالة المنتج إلى: ${translateStatus(response.data.delivery_item_status)}`);
            
            // Optionally, use Telegram's haptic feedback
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');

            // After a short delay, navigate back or allow user to do so
            setTimeout(() => {
                // navigate(-1); // Go back to the list
            }, 2000);

        } catch (err) {
            const apiError = err.response?.data?.error || 'فشل تحديث الحالة. الرجاء المحاولة مرة أخرى.';
            setError(apiError);
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to translate status keys to Arabic for display
    const translateStatus = (statusKey) => {
        const statuses = {
            'pending_assignment': 'في انتظار التعيين',
            'assigned_to_agent': 'معين لك',
            'out_for_delivery': 'في الطريق للتوصيل',
            'delivered': 'تم التوصيل',
            'delivery_failed': 'فشل التوصيل',
            'payment_pending': 'الدفع معلق'
        };
        return statuses[statusKey] || statusKey;
    };

    if (!item || !order) {
        return <div className="p-10 text-center text-gray-400">جاري تحميل تفاصيل المنتج... أو لم يتم العثور على التفاصيل.</div>;
    }

    const currentStatus = item.delivery_item_status;

    return (
        <div className="space-y-6 pb-10">
            {/* Item Info */}
            <section className="bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-start gap-4">
                    {item.product_image_url && (
                         <div 
                            className="w-20 h-20 rounded bg-gray-700 flex-shrink-0"
                            style={item.product_image_url.startsWith('linear-gradient') ? 
                                   { background: item.product_image_url } : 
                                   { backgroundImage: `url(${item.product_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        ></div>
                    )}
                    <div className="flex-grow">
                        <h2 className="text-lg font-semibold text-sky-400">{item.product_name}</h2>
                        <p className="text-sm text-gray-300">الكمية: {item.quantity}</p>
                        <p className="text-sm text-gray-300">السعر: {parseFloat(item.price_at_time_of_order).toFixed(2)} د.إ</p>
                        <p className="text-md font-bold text-white mt-1">الإجمالي للمنتج: {(item.quantity * parseFloat(item.price_at_time_of_order)).toFixed(2)} د.إ</p>
                    </div>
                </div>
                {item.product_description && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700">{item.product_description}</p>}
            </section>

            {/* Customer & Order Context */}
            <section className="bg-gray-800 p-4 rounded-lg shadow space-y-2">
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">معلومات الطلب والعميل</h3>
                <p className="text-sm text-gray-300 flex items-center gap-2"><Package size={16} /> طلب رقم: #{order.order_id}</p>
                <p className="text-sm text-gray-300 flex items-center gap-2"><User size={16} /> العميل: {order.customer_name}</p>
                <p className="text-sm text-gray-300 flex items-center gap-2"><Phone size={16} /> الهاتف: {order.customer_phone}</p>
                <p className="text-sm text-gray-300 flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0"/> 
                    <span>{order.customer_address1}{order.customer_address2 && `, ${order.customer_address2}`}, {order.customer_city}</span>
                </p>
            </section>

            {/* Status Update Section */}
            <section className="bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-md font-semibold text-gray-100 mb-3">تحديث حالة المنتج: <span className="text-sky-400">{translateStatus(currentStatus)}</span></h3>
                
                {error && <p className="bg-red-500/20 text-red-400 p-2 rounded text-xs mb-3 text-center">{error}</p>}
                {successMessage && <p className="bg-green-500/20 text-green-400 p-2 rounded text-xs mb-3 text-center">{successMessage}</p>}

                <div className="space-y-3">
                    {/* Common Actions */}
                    {currentStatus === 'assigned_to_agent' && (
                        <button onClick={() => handleStatusUpdate('out_for_delivery')} disabled={isLoading} className="btn-action bg-blue-500 hover:bg-blue-600">
                            <Truck size={18} className="mr-2"/> بدء التوصيل (في الطريق)
                        </button>
                    )}
                    {currentStatus === 'out_for_delivery' && (
                        <>
                            <button onClick={() => handleStatusUpdate('delivered', 'Payment collected in full.', true)} disabled={isLoading} className="btn-action bg-green-500 hover:bg-green-600">
                                <CheckCircle size={18} className="mr-2"/> تم التوصيل (تم الدفع)
                            </button>
                            <button onClick={() => handleStatusUpdate('payment_pending', 'Delivered, awaiting full payment.', false)} disabled={isLoading} className="btn-action bg-yellow-500 hover:bg-yellow-600">
                                 <Landmark size={18} className="mr-2"/> تم التوصيل (الدفع معلق)
                            </button>
                            <button onClick={() => handleStatusUpdate('delivery_failed', 'Customer not available.', false)} disabled={isLoading} className="btn-action bg-red-500 hover:bg-red-600">
                                <XCircle size={18} className="mr-2"/> فشل التوصيل
                            </button>
                        </>
                    )}
                     {/* Add more conditional buttons for other statuses if needed, e.g., from payment_pending to delivered */}
                     {(currentStatus === 'delivered' || currentStatus === 'delivery_failed' || currentStatus === 'payment_pending') && (
                         <p className="text-xs text-center text-gray-400 pt-2">تم تسجيل الحالة النهائية لهذا المنتج.</p>
                     )}
                </div>
                 {/* TODO: Add input for delivery_notes and payment_collected amount if needed */}
            </section>
            <button onClick={() => navigate(-1)} className="w-full mt-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">
                العودة إلى قائمة المهام
            </button>
        </div>
    );
};
// Add to your index.css or equivalent
// @layer components {
//   .btn-action { @apply w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-not-allowed; }
// }
export default OrderItemDetailPage;