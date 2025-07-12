// src/pages/DashboardPage.jsx
import React from 'react';

const DashboardPage = () => {
    const supplierInfo = JSON.parse(localStorage.getItem('supplierInfo'));
    return (
        <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                نظرة عامة
            </h2>
            {supplierInfo && <p className="text-lg text-gray-700">أهلاً بك، {supplierInfo.name}!</p>}
            {/* Dashboard content will go here */}
        </div>
    );
};
export default DashboardPage;