// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Users,
    ShoppingBag,
    TrendingUp,
    MessageCircle,
    Send,
    AlertCircle,
    CheckCircle,
    DollarSign,
    Package
} from 'lucide-react';
import { adminApiClient } from '../api/adminApiClient';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
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
    </div>
);

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState(null);

    useEffect(() => {
        fetchPlatformStats();
    }, []);

    const fetchPlatformStats = async () => {
        try {
            setIsLoading(true);
            const response = await adminApiClient.get('/api/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch platform stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMessage.trim()) return;

        setIsSendingBroadcast(true);
        setBroadcastResult(null);

        try {
            const response = await adminApiClient.post('/api/admin/broadcast', {
                message: broadcastMessage.trim()
            });

            setBroadcastResult({
                success: true,
                message: `تم إرسال الرسالة بنجاح إلى ${response.data.successCount} مستخدم`,
                details: response.data
            });
            setBroadcastMessage('');
        } catch (error) {
            setBroadcastResult({
                success: false,
                message: error.response?.data?.error || 'فشل في إرسال الرسالة'
            });
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل إحصائيات المنصة...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white p-6">
                <h1 className="text-2xl font-bold mb-2">لوحة تحكم المنصة</h1>
                <p className="opacity-90">نظرة شاملة على أداء منصة المستلزمات الطبية</p>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="إجمالي المستخدمين"
                        value={stats.total_users || 0}
                        icon={Users}
                        color="#8b5cf6"
                        subtitle="مستخدمين مسجلين"
                    />
                    <StatCard
                        title="الموردين النشطين"
                        value={stats.total_suppliers || 0}
                        icon={ShoppingBag}
                        color="#10b981"
                        subtitle="موردين مفعلين"
                    />
                    <StatCard
                        title="مندوبي التوصيل"
                        value={stats.total_agents || 0}
                        icon={Package}
                        color="#f59e0b"
                        subtitle="مندوبين نشطين"
                    />
                    <StatCard
                        title="طلبات اليوم"
                        value={stats.orders_today || 0}
                        icon={TrendingUp}
                        color="#3b82f6"
                        subtitle="طلبات جديدة"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Broadcast Message Panel */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <MessageCircle className="h-6 w-6 text-purple-500" />
                        <h3 className="text-lg font-semibold text-gray-800">إرسال رسالة جماعية</h3>
                    </div>

                    <form onSubmit={handleSendBroadcast} className="space-y-4">
                        <div>
                            <label htmlFor="broadcast" className="block text-sm font-medium text-gray-700 mb-2">
                                الرسالة
                            </label>
                            <textarea
                                id="broadcast"
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                placeholder="اكتب رسالتك هنا... سيتم إرسالها لجميع المستخدمين والموردين والمندوبين"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                maxLength={1000}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {broadcastMessage.length}/1000 حرف
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={!broadcastMessage.trim() || isSendingBroadcast}
                            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                        >
                            {isSendingBroadcast ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    جاري الإرسال...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    إرسال لجميع المستخدمين
                                </>
                            )}
                        </button>
                    </form>

                    {broadcastResult && (
                        <div className={`mt-4 p-4 rounded-lg ${
                            broadcastResult.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                {broadcastResult.success ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                )}
                                <p className={`text-sm font-medium ${
                                    broadcastResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {broadcastResult.message}
                                </p>
                            </div>
                            {broadcastResult.details && (
                                <p className="text-xs text-green-600 mt-1">
                                    نجح: {broadcastResult.details.successCount} | فشل: {broadcastResult.details.failCount}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Platform Overview */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">نظرة عامة على المنصة</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                <span className="text-sm font-medium">مبيعات الشهر</span>
                            </div>
                            <span className="font-bold text-green-600">
                                {stats?.sales_this_month ? `${parseFloat(stats.sales_this_month).toFixed(2)} د.إ` : '0 د.إ'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                <span className="text-sm font-medium">متوسط قيمة الطلب</span>
                            </div>
                            <span className="font-bold text-blue-600">
                                {stats?.orders_today > 0 && stats?.sales_this_month
                                    ? `${(stats.sales_this_month / stats.orders_today).toFixed(2)}.إ` : '0 د.إ'
                                }
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-orange-500" />
                                <span className="text-sm font-medium">حالة النظام</span>
                            </div>
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                يعمل بشكل طبيعي
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-3">إجراءات سريعة</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => window.location.href = '/suppliers'}
                                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors"
                            >
                                إدارة الموردين
                            </button>
                            <button
                                onClick={() => window.location.href = '/featured-items'}
                                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md transition-colors"
                            >
                                العروض المميزة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;