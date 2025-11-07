// src/pages/ManageSuppliersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Users, PlusCircle, Edit3, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'; // Added more icons
import SupplierFormModal from '../components/SupplierFormModal'; // <<< IMPORT
import { adminApiClient } from '../api/adminApiClient';

const ManageSuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
// Inside ManageSuppliersPage component
// ... (suppliers, isLoading, error state) ...
const [showSupplierModal, setShowSupplierModal] = useState(false);
const [editingSupplier, setEditingSupplier] = useState(null); // null for Add, object for Edit
const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false); // For modal's save button
    // TODO: State for Add/Edit Supplier Modal
    // const [showSupplierModal, setShowSupplierModal] = useState(false);
    // const [editingSupplier, setEditingSupplier] = useState(null);

    const fetchAdminSuppliers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Assuming your backend returns { items: [...] } structure even without full pagination yet
            const response = await adminApiClient.get('/api/admin/suppliers');
            setSuppliers(response.data.items || response.data || []); // Handle both structures
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch suppliers.');
            console.error("Admin fetch suppliers error:", err);
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminSuppliers();
    }, [fetchAdminSuppliers]);

    const handleAddSupplier = () => {
        setEditingSupplier(null); // Clear any previous editing state
    setShowSupplierModal(true);
        console.log("TODO: Open Add Supplier Modal");
        // setEditingSupplier(null);
        // setShowSupplierModal(true);
    };

    const handleEditSupplier = (supplier) => {
         setEditingSupplier(supplier); // Set the supplier to pre-fill the form
    setShowSupplierModal(true);
        console.log("TODO: Open Edit Supplier Modal for:", supplier.name);
        // setEditingSupplier(supplier);
        // setShowSupplierModal(true);
    };
    
    const handleDeleteSupplier = async (supplierId, supplierName) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supplierName}"? This action might have significant consequences and cannot be undone.`)) {
        setIsLoading(true); // Use the general loading state or a specific one for delete
        setError('');
        try {
            await adminApiClient.delete(`/api/admin/suppliers/${supplierId}`);
            // alert('Supplier deleted successfully!'); // Optional, or use a toast notification
            fetchAdminSuppliers(); // Refresh the supplier list to remove the deleted one
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to delete supplier. It might be linked to other records (e.g., products).';
            setError(errorMessage); // Display error on the page
            alert(errorMessage); // Also alert for immediate feedback
            console.error("Admin delete supplier error:", err.response || err.message);
        } finally {
            setIsLoading(false);
        }
    }
};


    const handleToggleSupplierStatus = async (supplierId, currentIsActive) => {
        const action = currentIsActive ? "deactivate" : "activate";
        if (window.confirm(`Are you sure you want to ${action} this supplier?`)) {
            // Optimistic UI update (optional, but makes UI feel faster)
            // setSuppliers(prevSuppliers => 
            //     prevSuppliers.map(s => 
            //         s.id === supplierId ? { ...s, is_active: !s.is_active } : s
            //     )
            // );
            // setError(''); // Clear previous main error

            try {
                // Call the backend endpoint
                const response = await adminApiClient.put(`/api/admin/suppliers/${supplierId}/toggle-active`);
                
                // Update the specific supplier in the local state with the response from the backend
                setSuppliers(prevSuppliers => 
                    prevSuppliers.map(s => 
                        s.id === supplierId ? response.data : s // response.data should be the updated supplier object
                    )
                );
                // alert(`Supplier status updated to ${response.data.is_active ? 'Active' : 'Inactive'}.`); // Optional
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to update supplier status.');
                console.error("Toggle supplier status error:", err.response || err.message);
                // Revert optimistic update if it failed
                // fetchAdminSuppliers(); // Or just refetch all to be sure state is correct
            }
        }
    };
// Inside ManageSuppliersPage component
const handleSaveSupplier = async (supplierData, supplierIdToEdit) => {
    setIsSubmittingSupplier(true);
    // The modal will display its own errors if 'throw new Error' is used here
    try {
        if (supplierIdToEdit) {
            // Editing existing supplier - using adminApiClient
            await adminApiClient.put(`/api/admin/suppliers/${supplierIdToEdit}`, supplierData);
            // alert('Supplier updated successfully!'); // Optional
        } else {
            // Adding new supplier - using adminApiClient
            await adminApiClient.post(`/api/admin/suppliers`, supplierData);
            // alert('Supplier added successfully!'); // Optional
        }
        setShowSupplierModal(false); // Close modal on success
        fetchAdminSuppliers();    // Refresh supplier list from backend
    } catch (err) {
        console.error("Save supplier error:", err.response?.data?.error || err.message);
        // Re-throw the error so the modal's catch block can display it
        throw new Error(err.response?.data?.error || 'Failed to save supplier. Please check the details.');
    } finally {
        setIsSubmittingSupplier(false);
    }
};

    if (isLoading && suppliers.length === 0) {
        return <div className="flex justify-center items-center h-64"><p className="text-gray-500 text-lg">جاري تحميل قائمة الموردين...</p></div>;
    }

    if (error) {
        return (
             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md my-6" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertCircle className="h-6 w-6 text-red-500 mr-3"/></div>
                    <div>
                        <p className="font-bold">حدث خطأ</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto"> {/* Removed px-4 py-6, parent layout handles padding */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <Users size={28} className="mr-3 text-purple-600" /> {/* ml-3 for RTL */}
                    قائمة الموردين
                </h2>
                <button
                    onClick={handleAddSupplier}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md flex items-center transition-colors shadow-sm hover:shadow-md"
                >
                    <PlusCircle size={20} className="mr-2" /> {/* ml-2 for RTL */}
                    إضافة مورد جديد
                </button>
            </div>

            {suppliers.length === 0 && !isLoading ? (
                <div className="text-center py-16 bg-white rounded-lg shadow">
                    <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-xl text-gray-600">لا يوجد موردون مسجلون حالياً.</p>
                    <p className="text-sm text-gray-500 mt-1">يمكنك إضافة مورد جديد باستخدام الزر أعلاه.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموقع</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th> {/* For Active/Inactive */}
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.category || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.location || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button 
        onClick={() => handleToggleSupplierStatus(supplier.id, supplier.is_active)}
        title={supplier.is_active ? "Click to Deactivate" : "Click to Activate"}
        className={`p-1 rounded-full ${supplier.is_active ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}
    >
        {supplier.is_active ? <ToggleRight size={22}/> : <ToggleLeft size={22}/>}
    </button>
    <span className={`ml-2 text-xs font-semibold ${supplier.is_active ? 'text-green-700' : 'text-red-700'}`}>
        {supplier.is_active ? 'فعال' : 'غير فعال'}
    </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 space-x-reverse"> {/* For RTL */}
                                        <button onClick={() => handleEditSupplier(supplier)} title="Edit Supplier" className="text-indigo-600 hover:text-indigo-800 transition-colors p-1">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteSupplier(supplier.id, supplier.name)} title="Delete Supplier" className="text-red-600 hover:text-red-800 transition-colors p-1">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

             {/* TODO: Add/Edit Supplier Modal will go here */}

            {/* {showSupplierModal && <SupplierFormModal supplier={editingSupplier} onClose={() => setShowSupplierModal(false)} onSave={fetchAdminSuppliers} />} */}
            {showSupplierModal && (
            <SupplierFormModal
                isOpen={showSupplierModal}
                onClose={() => {
                    setShowSupplierModal(false);
                    setEditingSupplier(null); // Important to clear editing state
                }}
                onSave={handleSaveSupplier}
                supplierToEdit={editingSupplier}
                isLoading={isSubmittingSupplier}
            />
        )}
        </div>
    );
};

export default ManageSuppliersPage;