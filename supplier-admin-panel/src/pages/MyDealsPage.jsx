// src/pages/MyDealsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Tag, PlusCircle, Edit3, Trash2, AlertCircle, PackageOpen } from 'lucide-react';
import DealFormModal from '../components/DealFormModal'; // Import the modal

// apiClient setup (same as in ProductsPage)
const getAuthToken = () => localStorage.getItem('supplierToken');
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001',
});
apiClient.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, error => Promise.reject(error));

const MyDealsPage = () => {
    const [deals, setDeals] = useState([]);
    const [supplierProducts, setSupplierProducts] = useState([]); // For the modal dropdown
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [showDealModal, setShowDealModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [isSubmittingDeal, setIsSubmittingDeal] = useState(false);

    const fetchSupplierDeals = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const dealsResponse = await apiClient.get('/api/supplier/deals');
            setDeals(dealsResponse.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch deals.');
            setDeals([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSupplierOwnedProducts = useCallback(async () => {
        // This fetches products for the "Product Associated" dropdown in the modal
        try {
            const productsResponse = await apiClient.get('/api/supplier/products'); // Your existing endpoint
            setSupplierProducts(productsResponse.data || []);
        } catch (err) {
            console.error("Failed to fetch supplier products for deal form:", err);
            setSupplierProducts([]); // Set to empty if fetch fails
        }
    }, []);

    useEffect(() => {
        fetchSupplierDeals();
        fetchSupplierOwnedProducts(); // Fetch products when page loads
    }, [fetchSupplierDeals, fetchSupplierOwnedProducts]);

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
                // TODO: Implement PUT /api/supplier/deals/:dealId backend endpoint
                await apiClient.put(`/api/supplier/deals/${dealIdToEdit}`, dealData);
            } else {
                await apiClient.post('/api/supplier/deals', dealData);
            }
            setShowDealModal(false);
            fetchSupplierDeals();
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Failed to save deal.');
        } finally {
            setIsSubmittingDeal(false);
        }
    };

    const handleDeleteDeal = async (dealId, dealTitle) => {
    if (window.confirm(`Are you sure you want to delete the deal "${dealTitle}"? This action cannot be undone.`)) {
        setIsLoading(true); // Or a specific deleting state
        try {
            await apiClient.delete(`/api/supplier/deals/${dealId}`);
            // alert('Deal deleted successfully!');
            fetchSupplierDeals(); // Refresh the list
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete deal.');
            console.error("Delete deal error:", err.response || err.message);
        } finally {
            setIsLoading(false);
        }
    }
};

    if (isLoading && deals.length === 0) return <div className="text-center p-10">جاري تحميل العروض...</div>;
    if (error) return <div className="bg-red-100 text-red-700 p-4 m-4 rounded text-center">{error}</div>;

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <Tag size={28} className="mr-3 text-green-600" /> {/* ml-3 for RTL */}
                    عروضي الخاصة
                </h2>
                <button onClick={handleAddDeal} className="btn-primary flex items-center">
                    <PlusCircle size={20} className="mr-2" /> إضافة عرض جديد {/* ml-2 for RTL */}
                </button>
            </div>

            {deals.length === 0 && !isLoading ? (
                 <div className="text-center py-16 bg-white rounded-lg shadow">
                    <PackageOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-xl text-gray-600">لم تقم بإضافة أي عروض بعد.</p>
                    <p className="text-sm text-gray-500 mt-1">ابدأ بإضافة عرض جديد لمنتجاتك أو لمتجرك بشكل عام.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deals.map(deal => (
                        <div key={deal.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                            {deal.image_url && (
                                <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${deal.image_url})` }}></div>
                            )}
                            {!deal.image_url && (
                                 <div className="h-40 w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                    <Tag size={48} />
                                </div>
                            )}
                            <div className="p-4 flex-grow flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">{deal.title}</h3>
                                {deal.product_name && <p className="text-xs text-blue-600 mb-1">مرتبط بالمنتج: {deal.product_name}</p>}
                                <p className="text-sm text-gray-600 mb-2 flex-grow line-clamp-3">{deal.description || "لا يوجد وصف."}</p>
                                {deal.discount_percentage && <p className="text-md font-bold text-red-600 mb-2">خصم {deal.discount_percentage}%</p>}
                                <div className="text-xs text-gray-500 space-y-0.5">
                                    {deal.start_date && <p>يبدأ: {new Date(deal.start_date).toLocaleDateString('ar-EG')}</p>}
                                    {deal.end_date && <p>ينتهي: {new Date(deal.end_date).toLocaleDateString('ar-EG')}</p>}
                                </div>
                                <p className={`mt-2 text-xs font-semibold ${deal.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                    {deal.is_active ? 'فعال' : 'غير فعال'}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 border-t flex justify-end space-x-2 space-x-reverse">
                                <button onClick={() => handleEditDeal(deal)} className="text-sm text-indigo-600 hover:text-indigo-800 p-1"><Edit3 size={16}/></button>
                                <button onClick={() => handleDeleteDeal(deal.id, deal.title)} className="text-sm text-red-600 hover:text-red-800 p-1"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {showDealModal && (
                <DealFormModal
                    isOpen={showDealModal}
                    onClose={() => { setShowDealModal(false); setEditingDeal(null); }}
                    onSave={handleSaveDeal}
                    dealToEdit={editingDeal}
                    supplierProducts={supplierProducts}
                    isLoading={isSubmittingDeal}
                />
            )}
             {/* Basic button styling (can be expanded or put in index.css) */}
             <style jsx>{`
                .btn-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 600; }
                .btn-primary:hover { background-color: #4338ca; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};
export default MyDealsPage;