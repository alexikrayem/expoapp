// src/pages/OrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Or your preferred HTTP client
import { Eye, Package, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'; // Icons

// Helper to get token and create apiClient (assuming it's not globally available or passed via context)
// If you have a global apiClient instance, use that instead.
const getAuthToken = () => localStorage.getItem('supplierToken');
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001',
});
apiClient.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, error => Promise.reject(error));


const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // For pagination (optional, implement later if needed)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    // const [limit, setLimit] = useState(10); // If you want to control limit from frontend

    // State to manage which order's details are expanded
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const fetchSupplierOrders = useCallback(async (page = 1) => {
        setIsLoading(true);
        setError('');
        try {
            // const response = await apiClient.get(`/api/supplier/orders?page=${page}&limit=${limit}`);
            const response = await apiClient.get(`/api/supplier/orders?page=${page}`); // Simpler for now
            setOrders(response.data.items || []);
            setCurrentPage(response.data.currentPage || 1);
            setTotalPages(response.data.totalPages || 0);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch orders.');
            console.error("Fetch orders error:", err);
            setOrders([]); // Clear orders on error
        } finally {
            setIsLoading(false);
        }
    }, []); // Add limit to dependencies if you make it stateful

    useEffect(() => {
        fetchSupplierOrders(currentPage);
    }, [fetchSupplierOrders, currentPage]);

    const toggleOrderDetails = (orderId) => {
        setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
    };

    // TODO: Functions to handle status updates for items/orders later

    if (isLoading && orders.length === 0) { // Show full page loading only on initial load
        return <div className="flex justify-center items-center h-64"><p className="text-gray-500 text-lg">جاري تحميل الطلبات...</p></div>;
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md my-6" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertCircle className="h-6 w-6 text-red-500 mr-3" /></div>
                    <div>
                        <p className="font-bold">حدث خطأ</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-semibold text-gray-800">إدارة الطلبات</h2>
                {/* Maybe a filter section here later (by status, date range) */}
            </div>

            {orders.length === 0 && !isLoading ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-xl text-gray-600">لا توجد طلبات لعرضها حالياً.</p>
                    <p className="text-sm text-gray-500 mt-1">عندما تتلقى طلبات جديدة تحتوي على منتجاتك، ستظهر هنا.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.order_id} className="bg-white shadow-lg rounded-xl overflow-hidden transition-shadow hover:shadow-xl">
                            <div 
                                className="p-4 md:p-5 cursor-pointer flex justify-between items-center border-b border-gray-200"
                                onClick={() => toggleOrderDetails(order.order_id)}
                            >
                                <div className="flex-grow">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-1">
                                        <p className="text-sm font-semibold text-indigo-600">طلب رقم: #{order.order_id}</p>
                                        <p className="text-xs text-gray-500">{new Date(order.order_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <p className="text-xs text-gray-700">العميل: <span className="font-medium">{order.customer_name || 'غير متوفر'}</span></p>
                                </div>
                                <div className="flex flex-col items-end text-right ml-4 flex-shrink-0"> {/* mr-4 for RTL */}
                                    <p className="text-sm font-semibold text-gray-800">{order.supplier_order_value} د.إ</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                                        order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                        order.order_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                        order.order_status === 'shipped' ? 'bg-green-100 text-green-800' :
                                        order.order_status === 'delivered' ? 'bg-teal-100 text-teal-800' :
                                        order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {/* Translate status later */}
                                        {order.order_status} 
                                    </span>
                                </div>
                                <button className="p-1 text-gray-400 hover:text-gray-600">
                                    {expandedOrderId === order.order_id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </button>
                            </div>

                            {expandedOrderId === order.order_id && (
                                <div className="p-4 md:p-5 bg-gray-50/50 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">تفاصيل المنتجات المطلوبة منك:</h4>
                                    {order.items_for_this_supplier.map(item => (
                                        <div key={item.order_item_id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                            {item.product_image_url && (
                                                <div 
                                                    className="w-12 h-12 rounded bg-gray-200 flex-shrink-0"
                                                    style={item.product_image_url.startsWith('linear-gradient') ? 
                                                           { background: item.product_image_url } : 
                                                           { backgroundImage: `url(${item.product_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                                ></div>
                                            )}
                                            <div className="flex-grow">
                                                <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                                                <p className="text-xs text-gray-500">الكمية: {item.quantity} × {parseFloat(item.price_at_time_of_order).toFixed(2)} د.إ</p>
                                            </div>
                                            <div className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                                {(parseFloat(item.price_at_time_of_order) * item.quantity).toFixed(2)} د.إ
                                            </div>
                                            {/* TODO: Add item status update UI here later */}
                                            {/* <span className="text-xs ...">{item.supplier_item_status}</span> */}
                                        </div>
                                    ))}
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <h5 className="text-xs font-medium text-gray-600 mb-1">عنوان التوصيل للعميل:</h5>
                                        <p className="text-xs text-gray-500">{order.customer_address1}</p>
                                        {order.customer_address2 && <p className="text-xs text-gray-500">{order.customer_address2}</p>}
                                        <p className="text-xs text-gray-500">{order.customer_city}</p>
                                        <p className="text-xs text-gray-500">الهاتف: {order.customer_phone || 'غير متوفر'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {/* TODO: Add Pagination controls here if totalPages > 1 */}
                </div>
            )}
        </div>
    );
};

export default OrdersPage;