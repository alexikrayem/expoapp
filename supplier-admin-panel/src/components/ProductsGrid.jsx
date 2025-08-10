// src/components/ProductsGrid.jsx - Enhanced products grid with selection and quick actions
import React, { useState } from 'react';
import { 
    Edit3, 
    Trash2, 
    Package, 
    PackageX, 
    Tag, 
    TrendingUp,
    Zap,
    MoreVertical,
    Check,
    AlertTriangle,
    DollarSign
} from 'lucide-react';
import QuickActionsPanel from './QuickActionsPanel';

const ProductCard = ({ product, onEdit, onDelete, onQuickAction, isSelected, onSelect }) => {
    const [showActions, setShowActions] = useState(false);
    
    const isOutOfStock = product.stock_level === 0;
    const isOnSale = product.is_on_sale && product.discount_price;
    const isLowStock = product.stock_level > 0 && product.stock_level <= 5;

    const quickActions = [
        {
            id: 'toggle_stock',
            label: isOutOfStock ? 'إعادة التخزين' : 'نفد المخزون',
            icon: isOutOfStock ? Package : PackageX,
            color: isOutOfStock ? 'text-green-600' : 'text-red-600',
            action: () => onQuickAction(product.id, 'toggle_stock', { 
                stock_level: isOutOfStock ? 10 : 0 
            })
        },
        {
            id: 'toggle_sale',
            label: isOnSale ? 'إلغاء التخفيض' : 'تفعيل تخفيض',
            icon: Tag,
            color: isOnSale ? 'text-blue-600' : 'text-orange-600',
            action: () => onQuickAction(product.id, 'toggle_sale', {
                is_on_sale: !isOnSale,
                discount_price: isOnSale ? null : product.price * 0.8
            })
        }
    ];

    return (
        <div className={`
            bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 relative
            ${isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-lg'}
            ${isOutOfStock ? 'opacity-75' : ''}
        `}>
            {/* Selection checkbox */}
            <div className="absolute top-2 left-2 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(product);
                    }}
                    className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${isSelected 
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' 
                            : 'bg-white border-gray-300 hover:border-indigo-400 shadow-sm'
                        }
                    `}
                >
                    {isSelected && <Check className="h-4 w-4" />}
                </button>
            </div>

            {/* Product image */}
            <div className="relative h-48 bg-gray-200">
                {product.image_url ? (
                    <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div 
                    className="w-full h-full flex items-center justify-center text-gray-400"
                    style={{ display: product.image_url ? 'none' : 'flex' }}
                >
                    <Package className="h-12 w-12" />
                </div>

                {/* Status badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {isOutOfStock && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                            نفد المخزون
                        </span>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                            مخزون منخفض
                        </span>
                    )}
                    {isOnSale && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                            تخفيض {Math.round((1 - product.discount_price / product.price) * 100)}%
                        </span>
                    )}
                </div>

                {/* Quick actions menu */}
                <div className="absolute bottom-2 right-2">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(!showActions);
                            }}
                            className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                        >
                            <Zap className="h-4 w-4" />
                        </button>
                        
                        {showActions && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border p-2 min-w-[150px] z-20">
                                {quickActions.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            action.action();
                                            setShowActions(false);
                                        }}
                                        className={`
                                            w-full flex items-center gap-2 p-2 rounded-md text-sm
                                            hover:bg-gray-100 ${action.color} transition-colors
                                        `}
                                    >
                                        <action.icon className="h-4 w-4" />
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Product details */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                
                <div className="flex items-center justify-between mb-3">
                    <div>
                        {isOnSale ? (
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-600">
                                    {parseFloat(product.discount_price).toFixed(2)} د.إ
                                </span>
                                <span className="text-sm text-gray-500 line-through">
                                    {parseFloat(product.price).toFixed(2)} د.إ
                                </span>
                            </div>
                        ) : (
                            <span className="text-lg font-bold text-gray-800">
                                {parseFloat(product.price).toFixed(2)} د.إ
                            </span>
                        )}
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        isOutOfStock ? 'text-red-600 bg-red-100' : 
                        isLowStock ? 'text-yellow-600 bg-yellow-100' : 
                        'text-green-600 bg-green-100'
                    }`}>
                        {product.stock_level} قطعة
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(product);
                        }}
                        className="flex-1 bg-indigo-100 text-indigo-700 py-2 px-3 rounded-md hover:bg-indigo-200 transition-colors flex items-center justify-center gap-1"
                    >
                        <Edit3 className="h-4 w-4" />
                        <span className="text-sm">تعديل</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(product.id, product.name);
                        }}
                        className="bg-red-100 text-red-700 py-2 px-3 rounded-md hover:bg-red-200 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductsGrid = ({ products, onEdit, onDelete, onRefresh }) => {
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [showQuickActions, setShowQuickActions] = useState(false);

    const handleSelectProduct = (product) => {
        setSelectedProducts(prev => {
            const isSelected = prev.some(p => p.id === product.id);
            if (isSelected) {
                return prev.filter(p => p.id !== product.id);
            } else {
                return [...prev, product];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts([...products]);
        }
    };

    const handleQuickAction = async (productId, actionType, updateData) => {
        try {
            await supplierService.updateProduct(productId, updateData);
            onRefresh?.();
            
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.textContent = 'تم التحديث بنجاح';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
            
        } catch (error) {
            console.error('Quick action failed:', error);
            alert(`فشل في التحديث: ${error.message}`);
        }
    };

    const handleBulkActionComplete = () => {
        setSelectedProducts([]);
        setShowQuickActions(false);
        onRefresh?.();
    };

    return (
        <div className="space-y-4">
            {/* Selection controls */}
            {products.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                        >
                            <div className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                ${selectedProducts.length === products.length 
                                    ? 'bg-indigo-500 border-indigo-500 text-white' 
                                    : 'border-gray-300 hover:border-indigo-400'
                                }
                            `}>
                                {selectedProducts.length === products.length && <Check className="h-3 w-3" />}
                            </div>
                            {selectedProducts.length === products.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                        </button>
                        
                        {selectedProducts.length > 0 && (
                            <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                                {selectedProducts.length} من {products.length} محدد
                            </span>
                        )}
                    </div>

                    {selectedProducts.length > 0 && (
                        <button
                            onClick={() => setShowQuickActions(true)}
                            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 flex items-center gap-2 font-medium transition-colors shadow-sm"
                        >
                            <Zap className="h-4 w-4" />
                            إجراءات سريعة ({selectedProducts.length})
                        </button>
                    )}
                </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onQuickAction={handleQuickAction}
                        isSelected={selectedProducts.some(p => p.id === product.id)}
                        onSelect={handleSelectProduct}
                    />
                ))}
            </div>

            {/* Quick actions modal */}
            {showQuickActions && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <QuickActionsPanel
                        selectedProducts={selectedProducts}
                        onActionComplete={handleBulkActionComplete}
                        onClose={() => setShowQuickActions(false)}
                    />
                </div>
            )}
        </div>
    );
};

export default ProductsGrid;