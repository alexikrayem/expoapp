// src/pages/AssignedOrdersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { Package, AlertCircle, ChevronUp, ChevronDown, Edit3, MapPin, Phone, UserIcon as UserLucideIcon } from 'lucide-react'; // Renamed User to UserLucideIcon to avoid conflict if you have a User component

const ALL_POSSIBLE_STATUSES = [
    { key: 'assigned_to_agent', label: 'معينة لي', color: 'bg-yellow-500 text-yellow-900', default: true },
    { key: 'out_for_delivery', label: 'في الطريق', color: 'bg-blue-500 text-white', default: true },
    { key: 'payment_pending', label: 'الدفع معلق', color: 'bg-orange-500 text-white', default: false },
    { key: 'delivery_failed', label: 'فشل التوصيل', color: 'bg-red-500 text-white', default: false },
    { key: 'delivered', label: 'تم التوصيل', color: 'bg-green-500 text-white', default: false }
];

// Function to translate status keys (can be moved to a utils file)
const translateStatus = (statusKey) => {
    const status = ALL_POSSIBLE_STATUSES.find(s => s.key === statusKey);
    return status ? status.label : statusKey;
};


const AssignedOrdersPage = () => {
    const [groupedOrders, setGroupedOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const defaultFilters = ALL_POSSIBLE_STATUSES.filter(s => s.default).map(s => s.key);
    const [filterStatuses, setFilterStatuses] = useState(defaultFilters);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    
    const deliveryAgentInfo = JSON.parse(localStorage.getItem('deliveryAgentInfo'));
    const [expandedOrderId, setExpandedOrderId] = useState(null); // For accordion style item list

    const fetchAssignedOrderItems = useCallback(async (page = 1, statusesToFetch) => {
        setIsLoading(true);
        setError('');
        try {
            const statusesParam = statusesToFetch.join(',');
            const response = await apiClient.get(`/api/delivery/assigned-items?page=${page}&statuses=${statusesParam}`);
            
            const items = response.data.items || [];
            // Group items by order_id for better display
            const ordersMap = items.reduce((acc, item) => {
                if (!acc[item.order_id]) {
                    acc[item.order_id] = {
                        order_id: item.order_id, order_date: item.order_date,
                        overall_order_delivery_status: item.overall_order_delivery_status, // This is from orders table
                        customer_name: item.customer_name, customer_phone: item.customer_phone,
                        customer_address1: item.customer_address1, customer_address2: item.customer_address2,
                        customer_city: item.customer_city,
                        items: []
                    };
                }
                acc[item.order_id].items.push(item);
                return acc;
            }, {});
            setGroupedOrders(Object.values(ordersMap));

            setCurrentPage(response.data.currentPage || 1);
            setTotalPages(response.data.totalPages || 0);
            setTotalItems(response.data.totalItems || 0);
            // setFilterStatuses(response.data.currentFilterStatuses || defaultFilters); // Optionally sync with backend echoed filters

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch assigned items.');
            setGroupedOrders([]); 
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed defaultFilters from here as it's stable

    useEffect(() => {
        fetchAssignedOrderItems(currentPage, filterStatuses);
    }, [fetchAssignedOrderItems, currentPage, filterStatuses]);

    const handleFilterChange = (statusKey) => {
        setFilterStatuses(prev => {
            const newStatuses = prev.includes(statusKey) 
                ? prev.filter(s => s !== statusKey) 
                : [...prev, statusKey];
            // If no statuses are selected, revert to default or show all, or error.
            // For now, let's ensure at least one is selected, or it defaults if all are unchecked.
            if (newStatuses.length === 0) { 
                return defaultFilters; // Or an empty array to show "No filters selected" message
            }
            return newStatuses;
        });
        setCurrentPage(1); // Reset to first page when filters change
    };

    const toggleOrderDetails = (orderId) => {
        setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
    };
    
    // Calculate total value for an order based on items for this supplier
    const calculateOrderSupplierValue = (items) => {
        return items.reduce((sum, item) => sum + (parseFloat(item.price_at_time_of_order) * item.quantity), 0).toFixed(2);
    };


    if (isLoading && groupedOrders.length === 0) {
        return <div className="flex justify-center items-center h-64"><p className="text-gray-400 text-lg">جاري تحميل المهام...</p></div>;
    }

    return (
        <div className="space-y-4 pb-10">
            {/* Agent Welcome - can be removed if header has it */}
            {/* <h2 className="text-xl font-semibold text-sky-300 mb-1">المهام المعينة</h2> */}
            {/* {deliveryAgentInfo && <p className="text-xs text-gray-400 mb-4">مسجل الدخول كـ: {deliveryAgentInfo.name}</p>} */}

            {/* Filter Section */}
            <div className="mb-6 p-3 bg-gray-800/70 rounded-lg shadow-md sticky top-[70px] z-40 backdrop-blur-sm"> {/* Adjust top value based on your header height */}
                <p className="text-xs text-gray-300 mb-2 font-medium">فلترة حسب حالة المنتج:</p>
                <div className="flex flex-wrap gap-2">
                    {ALL_POSSIBLE_STATUSES.map(status => (
                        <button
                            key={status.key}
                            onClick={() => handleFilterChange(status.key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ease-in-out transform hover:scale-105
                                ${filterStatuses.includes(status.key) 
                                    ? `${status.color} shadow-lg ring-2 ring-offset-2 ring-offset-gray-800 ring-white/70`
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-700/80 border border-red-900 text-white px-4 py-3 rounded-md shadow-md" role="alert">
                    <div className="flex">
                        <div className="py-1"><AlertCircle className="h-5 w-5 mr-2"/></div>
                        <div><p className="text-sm">{error}</p></div>
                    </div>
                </div>
            )}

            {!isLoading && groupedOrders.length === 0 && !error && (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg shadow">
                    <Package className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                    <p className="text-xl text-gray-400">
                        {filterStatuses.length === defaultFilters.length && filterStatuses.every(s => defaultFilters.includes(s))
                            ? "لا توجد مهام معينة لك حالياً."
                            : "لا توجد مهام تطابق الفلاتر المختارة."}
                    </p>
                </div>
            )}

            {groupedOrders.map((order) => (
                <div key={order.order_id} className="bg-gray-800 shadow-xl rounded-xl overflow-hidden border border-gray-700/50">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-start gap-2">
                        <div>
                            <h3 className="text-md font-semibold text-sky-400">طلب #{order.order_id}</h3>
                            <p className="text-xs text-gray-400">{new Date(order.order_date).toLocaleString('ar-EG', {dateStyle: 'short', timeStyle: 'short'})}</p>
                            <p className="text-xs text-gray-300 mt-1">العميل: <span className="font-medium">{order.customer_name || 'غير متوفر'}</span></p>
                        </div>
                        <div className="text-left flex-shrink-0"> {/* text-right for RTL */}
                            <p className="text-sm font-bold text-gray-100">{calculateOrderSupplierValue(order.items)} د.إ</p>
                             <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                                ALL_POSSIBLE_STATUSES.find(s => s.key === order.items[0]?.delivery_item_status)?.color || 'bg-gray-600 text-gray-200'
                                // This status is for the first item, ideally derive an aggregate status for the order part for this agent
                            }`}>
                                {translateStatus(order.items[0]?.delivery_item_status || 'متعدد الحالات')}
                            </span>
                        </div>
                         <button onClick={() => toggleOrderDetails(order.order_id)} className="p-1 text-gray-400 hover:text-sky-400 self-center">
                            {expandedOrderId === order.order_id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                    </div>

                    {expandedOrderId === order.order_id && (
                        <div className="divide-y divide-gray-700/50">
                            <div className="p-4 bg-gray-800/30">
                                <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">معلومات العميل:</h4>
                                <p className="text-sm text-gray-300 flex items-center gap-2 mb-1"><UserLucideIcon size={14}/> {order.customer_name || "غير متوفر"}</p>
                                <p className="text-sm text-gray-300 flex items-center gap-2 mb-1"><Phone size={14}/> {order.customer_phone || "غير متوفر"}</p>
                                <p className="text-sm text-gray-300 flex items-start gap-2"><MapPin size={14} className="mt-0.5 flex-shrink-0"/> 
                                    <span>{order.customer_address1}{order.customer_address2 && `, ${order.customer_address2}`}, {order.customer_city}</span>
                                </p>
                            </div>
                            <div className="p-4">
                                <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">المنتجات في هذا الطلب:</h4>
                                <div className="space-y-2.5">
                                {order.items.map(item => (
                                    <div key={item.order_item_id} className="flex items-center justify-between p-2.5 bg-gray-700/70 rounded-md hover:bg-gray-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {/* Item image div */}
                                             <div className="w-10 h-10 rounded bg-gray-600 flex-shrink-0" style={item.product_image_url && item.product_image_url.startsWith('linear-gradient') ? { background: item.product_image_url } : { backgroundImage: `url(${item.product_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-100">{item.product_name}</p>
                                                <p className="text-xs text-gray-400">الكمية: {item.quantity} • حالة المنتج: <span className="font-semibold">{translateStatus(item.delivery_item_status)}</span></p>
                                            </div>
                                        </div>
                                        <Link 
                                            to={`/order-item/${item.order_item_id}`}
                                            state={{ itemDetails: item, orderContext: { order_id: order.order_id, customer_name: order.customer_name } }}
                                            className="p-2 text-sky-400 hover:text-sky-300 rounded-md hover:bg-sky-500/10"
                                            title="تحديث حالة المنتج"
                                        >
                                            <Edit3 size={18}/>
                                        </Link>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
             {/* TODO: Add pagination controls here if totalPages > 1 and !isLoading */}
        </div>
    );
};
export default AssignedOrdersPage;