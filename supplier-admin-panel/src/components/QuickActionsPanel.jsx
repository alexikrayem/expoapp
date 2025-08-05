// src/components/QuickActionsPanel.jsx - Quick actions for products
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
    CheckCircle
} from 'lucide-react';
import { supplierService } from '../services/supplierService';

const QuickActionsPanel = ({ selectedProducts, onActionComplete, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);

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
            id: 'restock',
            label: 'إعادة التخزين',
            icon: Package,
            color: 'bg-green-500 hover:bg-green-600',
            description: 'تعيين المخزون إلى 10 قطع',
            action: async () => {
                const updates = selectedProducts.map(p => ({ id: p.id, stock_level: 10 }));
                await supplierService.bulkUpdateStock(updates);
            }
        },
        {
            id: 'enable_sale',
            label: 'تفعيل التخفيض',
            icon: Tag,
            color: 'bg-orange-500 hover:bg-orange-600',
            description: 'تفعيل التخفيض بنسبة 20%',
            action: async () => {
                for (const product of selectedProducts) {
                    const discountPrice = product.price * 0.8; // 20% discount
                    await supplierService.toggleProductSale(product.id, true, discountPrice);
                }
            }
        },
        {
            id: 'disable_sale',
            label: 'إلغاء التخفيض',
            icon: TrendingUp,
            color: 'bg-blue-500 hover:bg-blue-600',
            description: 'إلغاء التخفيض وإرجاع السعر الأصلي',
            action: async () => {
                for (const product of selectedProducts) {
                    await supplierService.toggleProductSale(product.id, false, null);
                }
            }
        },
        {
            id: 'increase_stock',
            label: 'زيادة المخزون',
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
            label: 'تقليل المخزون',
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
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.textContent = `تم تطبيق ${actionConfig.label} بنجاح`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
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
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                        className="text-white hover:bg-white/20 p-2 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            disabled={isProcessing}
                            className={`
                                ${action.color} text-white p-4 rounded-lg transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transform hover:scale-105 active:scale-95
                                flex flex-col items-center gap-2
                            `}
                        >
                            {processingAction === action.id ? (
                                <div className="animate-spin">
                                    <RotateCcw className="h-6 w-6" />
                                </div>
                            ) : (
                                <action.icon className="h-6 w-6" />
                            )}
                            <span className="text-sm font-medium">{action.label}</span>
                            <span className="text-xs opacity-80 text-center">
                                {action.description}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">المنتجات المحددة:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedProducts.map(product => (
                            <div key={product.id} className="flex items-center gap-2 text-xs">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="truncate">{product.name}</span>
                                <span className="text-gray-500">({product.stock_level} في المخزون)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickActionsPanel;