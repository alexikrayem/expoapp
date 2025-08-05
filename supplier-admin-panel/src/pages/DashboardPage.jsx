// src/pages/DashboardPage.jsx - Enhanced dashboard with analytics and quick actions
import React, { useState, useEffect } from 'react';
import { 
    Package, 
    ShoppingCart, 
    TrendingUp, 
    Users, 
    AlertTriangle,
    Eye,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { useSupplierData, useSupplierProducts, useSupplierOrders } from '../hooks/useSupplierData';
import { supplierService } from '../services/supplierService';
import TelegramIntegration from '../components/TelegramIntegration';
import CityManagement from '../components/CityManagement';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4" style={{ borderLeftColor: color }}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-full`} style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-6 w-6" style={{ color }} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center">
                <TrendingUp className={`h-4 w-4 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}% من الأسبوع الماضي
                </span>
            </div>
        )}
    </div>
);

const QuickActionCard = ({ title, description, icon: Icon, color, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200
            ${disabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                : `border-gray-300 hover:border-${color}-400 hover:bg-${color}-50`
            }
        `}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-${color}-100`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <div className="text-right">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
        </div>
    </button>
);

const RecentOrderItem = ({ order }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'confirmed': return 'text-blue-600 bg-blue-100';
            case 'completed': return 'text-green-600 bg-green-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
            <div className="flex-1">
                <p className="font-medium text-gray-800">طلب #{order.order_id}</p>
                <p className="text-sm text-gray-600">{order.customer_name}</p>
                <p className="text-xs text-gray-500">
                    {new Date(order.order_date).toLocaleDateString('ar-EG')}
                </p>
            </div>
            <div className="text-right">
                <p className="font-bold text-gray-800">{order.supplier_order_value} د.إ</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.order_status)}`}>
                    {order.order_status}
                </span>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const { supplierProfile, isLoading: profileLoading } = useSupplierData();
    const { products, isLoading: productsLoading } = useSupplierProducts();
    const { orders, isLoading: ordersLoading } = useSupplierOrders();
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsData = await supplierService.getStats();
                setStats(statsData);
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setIsLoadingStats(false);
            }
        };

        if (!productsLoading && !ordersLoading) {
            fetchStats();
        }
    }, [productsLoading, ordersLoading]);

    const handleQuickAction = async (action) => {
        try {
            switch (action) {
                case 'mark_all_in_stock':
                    const outOfStockProducts = products.filter(p => p.stock_level === 0);
                    if (outOfStockProducts.length === 0) {
                        alert('جميع المنتجات متوفرة في المخزون');
                        return;
                    }
                    if (window.confirm(`هل تريد تعيين ${outOfStockProducts.length} منتج كمتوفر؟`)) {
                        const updates = outOfStockProducts.map(p => ({ id: p.id, stock_level: 10 }));
                        await supplierService.bulkUpdateStock(updates);
                        window.location.reload(); // Simple refresh
                    }
                    break;
                    
                case 'enable_sale_all':
                    const regularPriceProducts = products.filter(p => !p.is_on_sale);
                    if (regularPriceProducts.length === 0) {
                        alert('جميع المنتجات عليها تخفيض بالفعل');
                        return;
                    }
                    if (window.confirm(`هل تريد تفعيل تخفيض 15% على ${regularPriceProducts.length} منتج؟`)) {
                        for (const product of regularPriceProducts) {
                            await supplierService.toggleProductSale(product.id, true, product.price * 0.85);
                        }
                        window.location.reload();
                    }
                    break;
                    
                default:
                    break;
            }
        } catch (error) {
            alert(`فشل في تنفيذ الإجراء: ${error.message}`);
        }
    };

    const recentOrders = orders.slice(0, 5);
    const lowStockProducts = products.filter(p => p.stock_level > 0 && p.stock_level <= 5);

    return (
        <div className="space-y-6">
            {/* Welcome section */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white p-6">
                <h1 className="text-2xl font-bold mb-2">
                    أهلاً بك، {supplierProfile?.name || 'المورد'}!
                </h1>
                <p className="opacity-90">
                    إليك نظرة سريعة على أداء متجرك اليوم
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="إجمالي المنتجات"
                    value={products.length}
                    icon={Package}
                    color="#6366f1"
                    subtitle={`${products.filter(p => p.stock_level > 0).length} متوفر`}
                />
                <StatCard
                    title="الطلبات هذا الشهر"
                    value={stats?.ordersThisMonth || orders.length}
                    icon={ShoppingCart}
                    color="#10b981"
                    trend={stats?.ordersTrend}
                />
                <StatCard
                    title="المبيعات هذا الشهر"
                    value={`${stats?.salesThisMonth || '0'} د.إ`}
                    icon={DollarSign}
                    color="#f59e0b"
                    trend={stats?.salesTrend}
                />
                <StatCard
                    title="منتجات نفد مخزونها"
                    value={products.filter(p => p.stock_level === 0).length}
                    icon={AlertTriangle}
                    color="#ef4444"
                    subtitle="تحتاج إعادة تخزين"
                />
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">إجراءات سريعة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="تعيين الكل كمتوفر"
                        description="تعيين جميع المنتجات النافدة كمتوفرة"
                        icon={Package}
                        color="green"
                        onClick={() => handleQuickAction('mark_all_in_stock')}
                        disabled={products.filter(p => p.stock_level === 0).length === 0}
                    />
                    <QuickActionCard
                        title="تفعيل تخفيض شامل"
                        description="تفعيل تخفيض 15% على جميع المنتجات"
                        icon={Tag}
                        color="orange"
                        onClick={() => handleQuickAction('enable_sale_all')}
                        disabled={products.filter(p => !p.is_on_sale).length === 0}
                    />
                    <QuickActionCard
                        title="عرض التقارير"
                        description="تقرير مفصل عن الأداء"
                        icon={TrendingUp}
                        color="blue"
                        onClick={() => window.open('/reports', '_blank')}
                        disabled={true} // Will implement later
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Telegram Integration */}
                <TelegramIntegration />

                {/* City Management */}
                <CityManagement onUpdate={() => window.location.reload()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent orders */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">الطلبات الأخيرة</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {ordersLoading ? (
                            <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        ) : recentOrders.length > 0 ? (
                            recentOrders.map(order => (
                                <RecentOrderItem key={order.order_id} order={order} />
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>لا توجد طلبات حديثة</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Low stock alerts */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">تنبيهات المخزون المنخفض</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {productsLoading ? (
                            <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        ) : lowStockProducts.length > 0 ? (
                            lowStockProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                                        <div>
                                            <p className="font-medium text-gray-800">{product.name}</p>
                                            <p className="text-sm text-gray-600">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-orange-600">
                                            {product.stock_level} متبقي
                                        </span>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await supplierService.setProductInStock(product.id, 20);
                                                    window.location.reload();
                                                } catch (error) {
                                                    alert(`فشل في إعادة التخزين: ${error.message}`);
                                                }
                                            }}
                                            className="block text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                                        >
                                            إعادة تخزين
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                <p>جميع المنتجات متوفرة بكمية جيدة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;