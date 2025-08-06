// src/components/TelegramIntegration.jsx
import React, { useEffect, useState } from 'react';
import { MessageCircle, ExternalLink, Copy, CheckCircle, Bell, Users, Send } from 'lucide-react';

const TelegramIntegration = () => {
    const [telegramData, setTelegramData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [copied, setCopied] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            
            // Set theme colors for supplier panel
            tg.setHeaderColor('#1f2937');
            tg.setBackgroundColor('#f9fafb');
            
            // Get user data
            const userData = tg.initDataUnsafe?.user;
            if (userData) {
                setTelegramData(userData);
                setIsConnected(true);
            }

            // Configure main button for notifications
            tg.MainButton.setText('📱 إعدادات الإشعارات');
            tg.MainButton.color = '#3b82f6';
            tg.MainButton.textColor = '#ffffff';
            tg.MainButton.show();
            
            tg.onEvent('mainButtonClicked', () => {
                handleNotificationSettings();
            });

            // Handle back button
            tg.BackButton.onClick(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    tg.close();
                }
            });

            // Show back button on non-home pages
            if (window.location.pathname !== '/') {
                tg.BackButton.show();
            }

            console.log('✅ Telegram Web App initialized for supplier panel');
        }

        // Load recent notifications
        loadRecentNotifications();
    }, []);

    const handleNotificationSettings = () => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.showAlert('إعدادات الإشعارات ستكون متاحة قريباً. حالياً ستصلك إشعارات الطلبات الجديدة تلقائياً.');
        }
    };

    const loadRecentNotifications = () => {
        // Mock notifications - in real app, fetch from backend
        setNotifications([
            { id: 1, type: 'order', message: 'طلب جديد #1234', time: '5 دقائق' },
            { id: 2, type: 'stock', message: 'مخزون منخفض: دواء الضغط', time: '1 ساعة' },
            { id: 3, type: 'system', message: 'تحديث النظام مكتمل', time: '3 ساعات' }
        ]);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        });
    };

    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo') || '{}');
    const webAppUrl = `${window.location.origin}`;
    const botUsername = process.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username';

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">تكامل تيليجرام</h3>
            </div>

            {isConnected ? (
                <div className="space-y-6">
                    {/* Connection Status */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <div>
                                <span className="font-medium text-green-800">متصل بتيليجرام</span>
                                <p className="text-sm text-green-700">
                                    مرحباً {telegramData.first_name} {telegramData.last_name}
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bell className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">الإشعارات</span>
                                </div>
                                <p className="text-xs text-green-700">مفعلة للطلبات الجديدة</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">المندوبين</span>
                                </div>
                                <p className="text-xs text-green-700">متصلين بالبوت</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Notifications */}
                    <div>
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            الإشعارات الأخيرة
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {notifications.map(notification => (
                                <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            notification.type === 'order' ? 'bg-blue-500' :
                                            notification.type === 'stock' ? 'bg-orange-500' : 'bg-gray-500'
                                        }`} />
                                        <span className="text-sm text-gray-800">{notification.message}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{notification.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bot Integration Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-3">معلومات البوت</h4>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-blue-700">رابط البوت:</span>
                                <button
                                    onClick={() => copyToClipboard(`https://t.me/${botUsername}`)}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                >
                                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    <span className="text-sm">{copied ? 'تم النسخ' : 'نسخ'}</span>
                                </button>
                            </div>
                            
                            <div className="text-sm text-blue-700 space-y-1">
                                <p>• ستصلك إشعارات فورية عند وصول طلبات جديدة</p>
                                <p>• يمكن لمندوبي التوصيل استلام تفاصيل الطلبات</p>
                                <p>• تنبيهات المخزون المنخفض</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
                            className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-sm">فتح البوت</span>
                        </button>
                        
                        <button
                            onClick={handleNotificationSettings}
                            className="flex items-center justify-center gap-2 p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="text-sm">الإعدادات</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-800 mb-2">غير متصل بتيليجرام</h4>
                    <p className="text-sm text-gray-600 mb-6">
                        للحصول على إشعارات الطلبات وإدارة أفضل، افتح التطبيق من داخل تيليجرام
                    </p>
                    
                    <div className="space-y-4">
                        <a
                            href={`https://t.me/${botUsername}?start=supplier_${supplierInfo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            فتح في تيليجرام
                        </a>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>1. اضغط على الرابط أعلاه</p>
                            <p>2. ابدأ محادثة مع البوت</p>
                            <p>3. ارجع لهذا التطبيق من قائمة البوت</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelegramIntegration;