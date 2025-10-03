import React from 'react';

const RecentOrderItem = ({ order }) => {
    const getStatusColor = (status) => {
        const statusColors = {
            pending: 'text-yellow-600 bg-yellow-100',
            confirmed: 'text-blue-600 bg-blue-100',
            completed: 'text-green-600 bg-green-100',
            cancelled: 'text-red-600 bg-red-100',
        };
        return statusColors[status] || 'text-gray-600 bg-gray-100';
    };

    return (
        <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
                <p className="font-medium text-gray-800">طلب #{order.order_id}</p>
                <p className="text-sm text-gray-600">{order.customer_name || 'عميل غير محدد'}</p>
                <p className="text-xs text-gray-500">
                    {new Date(order.order_date).toLocaleDateString('ar-EG')}
                </p>
            </div>
            <div className="text-right">
                <p className="font-bold text-gray-800">
                    {parseFloat(order.supplier_order_value || 0).toFixed(2)} د.إ
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.order_status)}`}>
                    {order.order_status}
                </span>
            </div>
        </div>
    );
};

export default RecentOrderItem;
