// src/components/TelegramIntegration.jsx - Telegram Web App integration
import React, { useEffect, useState } from 'react';
import { MessageCircle, ExternalLink, Copy, CheckCircle } from 'lucide-react';

const TelegramIntegration = () => {
    const [telegramData, setTelegramData] = useState(null);
    const [botInfo, setBotInfo] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Initialize Telegram Web App if available
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            
            // Set theme colors
            tg.setHeaderColor('#1f2937');
            tg.setBackgroundColor('#f9fafb');
            
            // Get user data
            const userData = tg.initDataUnsafe?.user;
            if (userData) {
                setTelegramData(userData);
            }

            // Configure main button for quick actions
            tg.MainButton.setText('إجراءات سريعة');
            tg.MainButton.color = '#6366f1';
            tg.MainButton.textColor = '#ffffff';
            tg.MainButton.show();
            
            tg.onEvent('mainButtonClicked', () => {
                // Trigger quick actions panel
                document.dispatchEvent(new CustomEvent('openQuickActions'));
            });

            // Handle back button
            tg.BackButton.onClick(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    tg.close();
                }
            });
        }

        // Fetch bot information for integration setup
        const fetchBotInfo = async () => {
            try {
                // This would be an endpoint to get bot info
                // const response = await supplierService.getBotInfo();
                // setBotInfo(response);
            } catch (error) {
                console.error('Failed to fetch bot info:', error);
            }
        };

        fetchBotInfo();
    }, []);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo') || '{}');
    const webAppUrl = `${window.location.origin}/supplier-admin`;

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">تكامل تيليجرام</h3>
            </div>

            {telegramData ? (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">متصل بتيليجرام</span>
                        </div>
                        <p className="text-sm text-green-700">
                            مرحباً {telegramData.first_name} {telegramData.last_name}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                            معرف المستخدم: {telegramData.id}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-700">روابط مفيدة:</h4>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-800">رابط لوحة التحكم</p>
                                <p className="text-sm text-gray-600">شارك هذا الرابط مع فريقك</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(webAppUrl)}
                                className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600"
                            >
                                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'تم النسخ' : 'نسخ'}
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-800 mb-2">نصائح للاستخدام:</p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• استخدم الزر الأزرق أسفل الشاشة للإجراءات السريعة</li>
                                <li>• يمكنك إضافة هذا التطبيق إلى قائمة تيليجرام الرئيسية</li>
                                <li>• ستصلك إشعارات عند وصول طلبات جديدة</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-800 mb-2">غير متصل بتيليجرام</h4>
                    <p className="text-sm text-gray-600 mb-4">
                        للحصول على أفضل تجربة، افتح هذا التطبيق من داخل تيليجرام
                    </p>
                    <a
                        href={`https://t.me/your_bot_username?start=supplier_${supplierInfo.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        <ExternalLink className="h-4 w-4" />
                        فتح في تيليجرام
                    </a>
                </div>
            )}
        </div>
    );
};

export default TelegramIntegration;