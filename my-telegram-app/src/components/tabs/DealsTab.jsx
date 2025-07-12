import React from 'react';
import DealCard from '../common/DealCard';

const DealsTab = ({ deals, isLoading, error, onShowDetails }) => {
    if (isLoading) return <p className="text-center py-10">جاري تحميل العروض...</p>;
    if (error) return <p className="text-center text-red-500 py-10">{error}</p>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">العروض المميزة</h2>
            {!deals || deals.length === 0 ? (
                <p className="text-center text-gray-500 py-10">لا توجد عروض متاحة حالياً.</p>
            ) : (
                deals.map((deal, index) => (
                    <DealCard
                        key={deal.id ? `deal-${deal.id}` : `index-${index}`}
                        deal={deal}
                        onShowDetails={onShowDetails}
                    />
                ))
            )}
        </div>
    );
};

export default DealsTab;
