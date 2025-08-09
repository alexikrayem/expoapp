// src/pages/ProductsPage.jsx - Enhanced with quick actions and better UX
import React, { useState } from 'react';
import { PlusCircle, Search, Filter, Package, TrendingUp, AlertCircle, PackageX, Tag } from 'lucide-react';
import { useSupplierProducts } from '../hooks/useSupplierData';
import { supplierService } from '../services/supplierService';
import ProductFormModal from '../components/ProductFormModal';
import ProductsGrid from '../components/ProductsGrid';

const ProductsPage = () => {
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        status: 'all' // all, in_stock, out_of_stock, on_sale
    });
    
    const { products, isLoading, error, refetchProducts } = useSupplierProducts(filters);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Stats derived from products
    const stats = {
        total: products.length,
        inStock: products.filter(p => p.stock_level > 0).length,
        outOfStock: products.filter(p => p.stock_level === 0).length,
        onSale: products.filter(p => p.is_on_sale).length,
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setShowProductModal(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setShowProductModal(true);
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (window.confirm(`هل أنت متأكد من حذف المنتج "${productName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
            try {
                await supplierService.deleteProduct(productId);
                refetchProducts();
                
                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                notification.textContent = 'تم حذف المنتج بنجاح';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
                
            } catch (err) {
                alert(`فشل في حذف المنتج: ${err.message}`);
            }
        }
    };

    const handleSaveProduct = async (productData, productIdToEdit) => {
        setIsSubmitting(true);
        try {
            if (productIdToEdit) {
                await supplierService.updateProduct(productIdToEdit, productData);
            } else {
                await supplierService.createProduct(productData);
            }
            setShowProductModal(false);
            refetchProducts();
        } catch (err) {
            throw new Error(err.message || 'فشل في حفظ المنتج');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Filter products based on current filters
    const filteredProducts = products.filter(product => {
        if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
        }
        if (filters.category && product.category !== filters.category) {
            return false;
        }
        if (filters.status === 'in_stock' && product.stock_level === 0) {
            return false;
        }
        if (filters.status === 'out_of_stock' && product.stock_level > 0) {
            return false;
        }
        if (filters.status === 'on_sale' && !product.is_on_sale) {
            return false;
        }
        return true;
    });

    // Get unique categories for filter
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

    if (isLoading && products.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل المنتجات...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                    onClick={refetchProducts}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">إدارة المنتجات</h2>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1">
                                <Package className="h-4 w-4 text-blue-500" />
                                المجموع: <strong>{stats.total}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                متوفر: <strong>{stats.inStock}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                                <PackageX className="h-4 w-4 text-red-500" />
                                نفد المخزون: <strong>{stats.outOfStock}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                                <Tag className="h-4 w-4 text-orange-500" />
                                عليه تخفيض: <strong>{stats.onSale}</strong>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleAddProduct}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md"
                    >
                        <PlusCircle className="h-5 w-5" />
                        إضافة منتج جديد
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="البحث في المنتجات..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    
                    <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">جميع الفئات</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">جميع الحالات</option>
                        <option value="in_stock">متوفر</option>
                        <option value="out_of_stock">نفد المخزون</option>
                        <option value="on_sale">عليه تخفيض</option>
                    </select>
                </div>
            </div>

            {/* Products grid */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        {products.length === 0 ? 'لم تقم بإضافة أي منتجات بعد' : 'لا توجد منتجات تطابق الفلاتر'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {products.length === 0 
                            ? 'ابدأ بإضافة منتجك الأول لعرضه للعملاء'
                            : 'جرب تعديل الفلاتر أو البحث عن شيء آخر'
                        }
                    </p>
                    {products.length === 0 && (
                        <button
                            onClick={handleAddProduct}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
                        >
                            <PlusCircle className="h-5 w-5" />
                            إضافة منتج جديد
                        </button>
                    )}
                </div>
            ) : (
                <ProductsGrid
                    products={filteredProducts}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onRefresh={refetchProducts}
                />
            )}

            {/* Product form modal */}
            {showProductModal && (
                <ProductFormModal
                    isOpen={showProductModal}
                    onClose={() => {
                        setShowProductModal(false);
                        setEditingProduct(null);
                    }}
                    onSave={handleSaveProduct}
                    productToEdit={editingProduct}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};

export default ProductsPage;