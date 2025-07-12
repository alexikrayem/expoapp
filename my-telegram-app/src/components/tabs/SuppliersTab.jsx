// src/components/tabs/SuppliersTab.jsx
import React from 'react';
import SupplierCard from '../common/SupplierCard';

const SuppliersTab = ({ suppliers, isLoading, error, onShowDetails }) => {
    if (isLoading) return <p className="text-center py-10">جاري تحميل الموردين...</p>;
    if (error) return <p className="text-center text-red-500 py-10">{error}</p>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">الموردون المشاركون</h2>
            {!suppliers || suppliers.length === 0 ? (
                <p className="text-center text-gray-500 py-10">لا يوجد موردون متاحون حالياً.</p>
            ) : (
                suppliers.map(supplier => <SupplierCard key={supplier.id} supplier={supplier} onShowDetails={onShowDetails} />)
            )}
        </div>
    );
};

export default SuppliersTab;