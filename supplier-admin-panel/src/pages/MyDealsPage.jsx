// src/pages/MyDealsPage.jsx - Enhanced with better error handling and UX
import React, { useState, useEffect, useCallback } from 'react';
import { Tag, CirclePlus as PlusCircle, CreditCard as Edit3, Trash2, CircleAlert as AlertCircle, PackageOpen, Package, Calendar, Percent, Eye, EyeOff } from 'lucide-react';
import DealFormModal from '../components/DealFormModal';
import { useSupplierDeals, useSupplierProducts } from '../hooks/useSupplierData';
import { supplierService } from '../services/supplierService';

const MyDealsPage = () => {
    const { deals, isLoading, error, refetchDeals } = useSupplierDeals();
    const { products: supplierProducts } = useSupplierProducts();
    
    const [showDealModal, setShowDealModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [isSubmittingDeal, setIsSubmittingDeal] = useState(false);
    const [deletingDealId, setDeletingDealId] = useState(null);

    const handleAddDeal = () => {
        setEditingDeal(null);
        setShowDealModal(true);
    };

    const handleEditDeal = (deal) => {
        setEditingDeal(deal);
        setShowDealModal(true);
    };

    const handleSaveDeal = async (dealData, dealIdToEdit) => {
        setIsSubmittingDeal(true);
        try {
            if (dealIdToEdit) {
                await supplierService.updateDeal(dealIdToEdit, dealData);
            } else {
                await supplierService.createDeal(dealData);
            }
            setShowDealModal(false);
            refetchDeals();
            
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            notification.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                تم ${dealIdToEdit ? 'تحديث' : 'إضافة'} العرض بنجاح
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
        } catch (err) {
            throw new Error(err.message || 'Failed to save deal.');
        } finally {
            setIsSubmittingDeal(false);
        }
    };

    const handleDeleteDeal = async (dealId, dealTitle) => {
        if (window.confirm(`هل أنت متأكد من حذف العرض "${dealTitle}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
            setDeletingDealId(dealId);
            try {
                await supplierService.deleteDeal(dealId);
                refetchDeals();
                
                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                notification.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    تم حذف العرض بنجاح
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
                
            } catch (err) {
                alert(`فشل في حذف العرض: ${err.message}`);
                console.error("Delete deal error:", err);
            } finally {
                setDeletingDealId(null);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const isDateActive = (startDate, endDate) => {
        const now = new Date();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
    };

    if (isLoading && deals.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل العروض...</p>
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
                    onClick={refetchDeals}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                        <Tag size={28} className="text-orange-600" />
                        عروضي الخاصة
                    </h2>
                    <p className="text-gray-600 mt-1">إدارة العروض والخصومات الخاصة بمنتجاتك</p>
                </div>
                <button 
                    onClick={handleAddDeal} 
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
                >
                    <PlusCircle size={20} />
                    إضافة عرض جديد
                </button>
            </div>

            {deals.length === 0 && !isLoading ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                    <PackageOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">لم تقم بإضافة أي عروض بعد</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        ابدأ بإضافة عرض جديد لمنتجاتك أو لمتجرك بشكل عام لجذب المزيد من العملاء
                    </p>
                    <button 
                        onClick={handleAddDeal}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 inline-flex items-center gap-2 transition-colors"
                    >
                        <PlusCircle className="h-5 w-5" />
                        إضافة عرض جديد
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deals.map(deal => {
                        const isActive = deal.is_active && isDateActive(deal.start_date, deal.end_date);
                        const isBeingDeleted = deletingDealId === deal.id;
                        
                        return (
                            <div 
                                key={deal.id} 
                                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 ${
                                    isBeingDeleted ? 'opacity-50 scale-95' : 'hover:shadow-lg'
                                } ${isActive ? 'ring-2 ring-orange-200' : ''}`}
                            >
                                {/* Deal Image */}
                                <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500">
                                    {deal.image_url ? (
                                        <img 
                                            src={deal.image_url} 
                                            alt={deal.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full flex items-center justify-center text-white"
                                        style={{ display: deal.image_url ? 'none' : 'flex' }}
                                    >
                                        <div className="text-center">
                                            <Tag className="h-12 w-12 mx-auto mb-3 opacity-80" />
                                            <div className="text-2xl font-bold">
                                                {deal.discount_percentage ? `خصم ${deal.discount_percentage}%` : 'عرض خاص'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Status badges */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                                        {isActive ? (
                                            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm flex items-center gap-1">
                                                <Eye size={12} />
                                                نشط
                                            </span>
                                        ) : (
                                            <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm flex items-center gap-1">
                                                <EyeOff size={12} />
                                                غير نشط
                                            </span>
                                        )}
                                        
                                        {deal.discount_percentage && (
                                            <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                                                {deal.discount_percentage}% خصم
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Deal Content */}
                                <div className="p-4 flex-grow flex flex-col">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                                        {deal.title}
                                    </h3>
                                    
                                    {deal.product_name && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                <Package size={12} />
                                                {deal.product_name}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <p className="text-sm text-gray-600 mb-3 flex-grow line-clamp-3">
                                        {deal.description || "لا يوجد وصف للعرض."}
                                    </p>
                                    
                                    {/* Deal timing */}
                                    <div className="text-xs text-gray-500 space-y-1 mb-4">
                                        {deal.start_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                <span>يبدأ: {formatDate(deal.start_date)}</span>
                                            </div>
                                        )}
                                        {deal.end_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                <span>ينتهي: {formatDate(deal.end_date)}</span>
                                            </div>
                                        )}
                                        {!deal.start_date && !deal.end_date && (
                                            <span className="text-green-600 font-medium">عرض مفتوح</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditDeal(deal)} 
                                            disabled={isBeingDeleted}
                                            className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                            title="تعديل العرض"
                                        >
                                            <Edit3 size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteDeal(deal.id, deal.title)} 
                                            disabled={isBeingDeleted}
                                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                                            title="حذف العرض"
                                        >
                                            {isBeingDeleted ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                            ) : (
                                                <Trash2 size={16}/>
                                            )}
                                        </button>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500">
                                        تم الإنشاء: {formatDate(deal.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Deal Form Modal */}
            {showDealModal && (
                <DealFormModal
                    isOpen={showDealModal}
                    onClose={() => { 
                        setShowDealModal(false); 
                        setEditingDeal(null); 
                    }}
                    onSave={handleSaveDeal}
                    dealToEdit={editingDeal}
                    supplierProducts={supplierProducts}
                    isLoading={isSubmittingDeal}
                />
            )}
        </div>
    );
};

export default MyDealsPage;