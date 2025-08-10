// src/components/QuickActionsPanel.jsx - Enhanced quick actions for products
import React, { useState } from 'react';
import { 
    Package, 
    PackageX, 
    Tag, 
    TrendingUp, 
    TrendingDown, 
    RotateCcw,
    Zap,
    AlertTriangle,
    CheckCircle, 
    X,
    Percent,
    DollarSign
} from 'lucide-react';
import { supplierService } from '../services/supplierService';

const QuickActionsPanel = ({ selectedProducts, onActionComplete, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);
    const [customDiscountPercentage, setCustomDiscountPercentage] = useState(20);

    const quickActions = [
        {
            id: 'out_of_stock',
            label: 'نفد المخزون',
            icon: PackageX,
            color: 'bg-red-500 hover:bg-red-600',
            description: 'تعيين المخزون إلى صفر',
            action: async () => {
                const updates = selectedProducts.map(p => ({ id: p.id, stock_level: 0 }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'restock_10',
            label: 'إعادة التخزين (10)',
            icon: Package,
            color: 'bg-green-500 hover:bg-green-600',
            description: 'تعيين المخزون إلى 10 قطع',
            action: async () => {
                const updates = selectedProducts.map(p => ({ id: p.id, stock_level: 10 }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'restock_50',
            label: 'إعادة التخزين (50)',
            icon: Package,
            color: 'bg-green-600 hover:bg-green-700',
            description: 'تعيين المخزون إلى 50 قطعة',
            action: async () => {
                const updates = selectedProducts.map(p => ({ id: p.id, stock_level: 50 }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'enable_sale',
            label: `تفعيل تخفيض ${customDiscountPercentage}%`,
            icon: Tag,
            color: 'bg-orange-500 hover:bg-orange-600',
            description: `تفعيل التخفيض بنسبة ${customDiscountPercentage}%`,
            action: async () => {
                await supplierService.bulkToggleSale(
                    selectedProducts.map(p => p.id), 
                    true, 
                    customDiscountPercentage
                );
            }
        },
        {
            id: 'disable_sale',
            label: 'إلغاء التخفيض',
            icon: DollarSign,
            color: 'bg-blue-500 hover:bg-blue-600',
            description: 'إلغاء التخفيض وإرجاع السعر الأصلي',
            action: async () => {
                await supplierService.bulkToggleSale(
                    selectedProducts.map(p => p.id), 
                    false
                );
            }
        },
        {
            id: 'increase_stock',
            label: 'زيادة المخزون +5',
            icon: TrendingUp,
            color: 'bg-indigo-500 hover:bg-indigo-600',
            description: 'زيادة المخزون بـ 5 قطع',
            action: async () => {
                const updates = selectedProducts.map(p => ({ 
                    id: p.id, 
                    stock_level: (p.stock_level || 0) + 5 
                }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'decrease_stock',
            label: 'تقليل المخزون -5',
            icon: TrendingDown,
            color: 'bg-yellow-500 hover:bg-yellow-600',
            description: 'تقليل المخزون بـ 5 قطع',
            action: async () => {
                const updates = selectedProducts.map(p => ({ 
                    id: p.id, 
                    stock_level: Math.max(0, (p.stock_level || 0) - 5)
                }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'set_stock_100',
            label: 'مخزون كبير (100)',
            icon: Package,
            color: 'bg-purple-500 hover:bg-purple-600',
            description: 'تعيين المخزون إلى 100 قطعة',
            action: async () => {
                const updates = selectedProducts.map(p => ({ id: p.id, stock_level: 100 }));
                await supplierService.bulkUpdateStock(updates);
            }
        }
    ];

    const handleQuickAction = async (actionConfig) => {
        if (isProcessing) return;
        
        const confirmMessage = `هل أنت متأكد من تطبيق "${actionConfig.label}" على ${selectedProducts.length} منتج؟`;
        if (!window.confirm(confirmMessage)) return;

        setIsProcessing(true);
        setProcessingAction(actionConfig.id);

        try {
            await actionConfig.action();
            onActionComplete?.();
            onClose?.();
            
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            notification.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                تم تطبيق ${actionConfig.label} بنجاح
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 4000);
            
        } catch (error) {
            console.error('Quick action failed:', error);
            alert(`فشل في تطبيق ${actionConfig.label}: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingAction(null);
        }
    };

    if (selectedProducts.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">يرجى تحديد منتج واحد على الأقل لتطبيق الإجراءات السريعة</p>
                <button 
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                    إغلاق
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">الإجراءات السريعة</h3>
                        <p className="text-sm opacity-90">
                            {selectedProducts.length} منتج محدد
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Custom discount percentage input */}
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <label className="block text-sm font-medium text-orange-800 mb-2">
                        نسبة التخفيض المخصصة
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="90"
                            value={customDiscountPercentage}
                            onChange={(e) => setCustomDiscountPercentage(parseInt(e.target.value) || 20)}
                            className="w-20 px-3 py-2 border border-orange-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <Percent className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-700">
                            سيتم تطبيق خصم {customDiscountPercentage}% على المنتجات المحددة
                        </span>
                    </div>
                </div>

                {/* Action buttons grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            disabled={isProcessing}
                            className={`
                                ${action.color} text-white p-4 rounded-lg transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transform hover:scale-105 active:scale-95
                                flex flex-col items-center gap-2 min-h-[100px]
                                shadow-md hover:shadow-lg
                            `}
                        >
                            {processingAction === action.id ? (
                                <div className="animate-spin">
                                    <RotateCcw className="h-6 w-6" />
                                </div>
                            ) : (
                                <action.icon className="h-6 w-6" />
                            )}
                            <span className="text-sm font-medium text-center leading-tight">
                                {action.label}
                            </span>
                            <span className="text-xs opacity-80 text-center leading-tight">
                                {action.description}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Selected products summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        المنتجات المحددة:
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    <span className="truncate font-medium">{product.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                                    <span>مخزون: {product.stock_level}</span>
                                    <span>سعر: {parseFloat(product.price).toFixed(2)} د.إ</span>
                                    {product.is_on_sale && (
                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                            تخفيض
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action summary */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                        <strong>تذكير:</strong> ستؤثر هذه الإجراءات على {selectedProducts.length} منتج. 
                        تأكد من اختيارك قبل المتابعة.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QuickActionsPanel;