import React, { useState } from 'react';
import { Package, ShoppingCart, DollarSign, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Tag, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { useSupplierData, useSupplierProducts, useSupplierOrders, useSupplierStats } from '../hooks/useSupplierData';
import { supplierService } from '../services/supplierService';
import TelegramIntegration from '../components/TelegramIntegration';
import CityManagement from '../components/CityManagement';
import StatCard from '../components/StatCard';
import QuickActionCard from '../components/QuickActionCard';
import RecentOrderItem from '../components/RecentOrderItem';

const DashboardPage = () => {
    const { supplierProfile, error: profileError } = useSupplierData();
    const { products, isLoading: productsLoading, refetchProducts } = useSupplierProducts();
    const { orders, isLoading: ordersLoading } = useSupplierOrders();
    const { stats, isLoading: statsLoading, error: statsError, refetchStats } = useSupplierStats();

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchProducts(),
                refetchStats()
            ]);
        } catch (error) {
            console.error('Failed to refresh data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleQuickAction = async (action) => {
        try {
            switch (action) {
                case 'mark_all_in_stock': {
                    const outOfStockProducts = products.filter(p => p.stock_level === 0);
                    if (outOfStockProducts.length === 0) {
                        alert('جميع المنتجات متوفرة في المخزون');
                        return;
                    }
                    if (window.confirm(`هل تريد تعيين ${outOfStockProducts.length} منتج كمتوفر؟`)) {
                        const updates = outOfStockProducts.map(p => ({ id: p.id, stock_level: 10 }));
                        await supplierService.bulkUpdateStock(updates);
                        refetchProducts();
                        refetchStats();
                    }
                    break;
                }

                case 'enable_sale_all': {
                    const regularPriceProducts = products.filter(p => !p.is_on_sale);
                    if (regularPriceProducts.length === 0) {
                        alert('جميع المنتجات عليها تخفيض بالفعل');
                        return;
                    }
                    if (window.confirm(`هل تريد تفعيل تخفيض 15% على ${regularPriceProducts.length} منتج؟`)) {
                        await supplierService.bulkToggleSale(
                            regularPriceProducts.map(p => p.id),
                            true,
                            15
                        );
                        refetchProducts();
                        refetchStats();
                    }
                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            alert(`فشل في تنفيذ الإجراء: ${error.message}`);
        }
    };

    const recentOrders = orders.slice(0, 5);
    const lowStockProducts = products.filter(p => p.stock_level > 0 && p.stock_level <= 5);
    const outOfStockCount = products.filter(p => p.stock_level === 0).length;
    const regularPriceCount = products.filter(p => !p.is_on_sale).length;

    if (profileError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{profileError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            أهلاً بك، {supplierProfile?.name || 'المورد'}!
                        </h1>
                        <p className="opacity-90">
                            إليك نظرة سريعة على أداء متجرك اليوم
                        </p>
                    </div>
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors disabled:opacity-50"
                        title="تحديث البيانات"
                    >
                        <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="إجمالي المنتجات"
                    value={products.length}
                    icon={Package}
                    color="#6366f1"
                    subtitle={`${products.filter(p => p.stock_level > 0).length} متوفر`}
                    isLoading={productsLoading}
                />
                <StatCard
                    title="الطلبات هذا الشهر"
                    value={stats?.orders_this_month || 0}
                    icon={ShoppingCart}
                    color="#10b981"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="المبيعات هذا الشهر"
                    value={`${parseFloat(stats?.sales_this_month || 0).toFixed(2)} د.إ`}
                    icon={DollarSign}
                    color="#f59e0b"
                    isLoading={statsLoading}
                />
                <StatCard
                    title="منتجات نفد مخزونها"
                    value={stats?.out_of_stock_products || 0}
                    icon={AlertTriangle}
                    color="#ef4444"
                    subtitle="تحتاج إعادة تخزين"
                    isLoading={statsLoading}
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-500" />
                    إجراءات سريعة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="تعيين الكل كمتوفر"
                        description="تعيين جميع المنتجات النافدة كمتوفرة"
                        icon={Package}
                        color="green"
                        onClick={() => handleQuickAction('mark_all_in_stock')}
                        disabled={outOfStockCount === 0}
                        count={outOfStockCount}
                    />
                    <QuickActionCard
                        title="تفعيل تخفيض شامل"
                        description="تفعيل تخفيض 15% على جميع المنتجات"
                        icon={Tag}
                        color="orange"
                        onClick={() => handleQuickAction('enable_sale_all')}
                        disabled={regularPriceCount === 0}
                        count={regularPriceCount}
                    />
                    <QuickActionCard
                        title="إدارة المنتجات"
                        description="انتقل لصفحة إدارة المنتجات"
                        icon={TrendingUp}
                        color="blue"
                        onClick={() => window.location.href = '/products'}
                        disabled={false}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TelegramIntegration />
                <CityManagement onUpdate={handleRefreshAll} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">الطلبات الأخيرة</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {ordersLoading ? (
                            <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="text-gray-500 mt-2">جاري تحميل الطلبات...</p>
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

                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">تنبيهات المخزون المنخفض</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {productsLoading ? (
                            <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="text-gray-500 mt-2">جاري تحميل المنتجات...</p>
                            </div>
                        ) : lowStockProducts.length > 0 ? (
                            lowStockProducts.map(product => (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                                >
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
                                                    await supplierService.bulkUpdateStock([{
                                                        id: product.id,
                                                        stock_level: 20
                                                    }]);
                                                    refetchProducts();
                                                    refetchStats();
                                                } catch (error) {
                                                    alert(`فشل في إعادة التخزين: ${error.message}`);
                                                }
                                            }}
                                            className="block text-xs text-indigo-600 hover:text-indigo-800 mt-1 transition-colors"
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

            {statsError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <p className="text-yellow-800">
                            تعذر تحميل الإحصائيات: {statsError}
                        </p>
                        <button
                            onClick={refetchStats}
                            className="mr-auto bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
