// src/components/CityManagement.jsx - City management for suppliers
import React, { useState, useEffect } from 'react';
import { MapPin, Plus, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supplierService } from '../services/supplierService';

const CityManagement = ({ onUpdate }) => {
    const [allCities, setAllCities] = useState([]);
    const [supplierCities, setSupplierCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showAddCity, setShowAddCity] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                const [citiesResponse, supplierCitiesResponse] = await Promise.all([
                    supplierService.getCities(),
                    supplierService.getSupplierCities()
                ]);
                
                setAllCities(Array.isArray(citiesResponse) ? citiesResponse : []);
                setSupplierCities((supplierCitiesResponse || []).map(sc => sc.city_id));
            } catch (err) {
                console.error('Failed to fetch cities:', err);
                setError(err.message || 'Failed to fetch cities');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleToggleCity = async (cityId) => {
        const newSupplierCities = supplierCities.includes(cityId)
            ? supplierCities.filter(id => id !== cityId)
            : [...supplierCities, cityId];

        try {
            setIsSaving(true);
            await supplierService.updateSupplierCities(newSupplierCities);
            setSupplierCities(newSupplierCities);
            onUpdate?.();
            
            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
            notification.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                تم تحديث المدن بنجاح
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
        } catch (err) {
            console.error('Failed to update cities:', err);
            alert(`فشل في تحديث المدن: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const availableCities = allCities.filter(city => !supplierCities.includes(city.id));

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-5 w-5 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-gray-800">المدن التي تخدمها</h3>
                </div>
                {availableCities.length > 0 && (
                    <button
                        onClick={() => setShowAddCity(!showAddCity)}
                        disabled={isSaving}
                        className="bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        إضافة مدينة
                    </button>
                )}
            </div>

            {/* Current cities */}
            <div className="space-y-2 mb-4">
                {supplierCities.length > 0 ? (
                    allCities
                        .filter(city => supplierCities.includes(city.id))
                        .map(city => (
                            <div key={city.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-600" />
                                    <span className="font-medium text-green-800">{city.name}</span>
                                </div>
                                <button
                                    onClick={() => handleToggleCity(city.id)}
                                    disabled={isSaving}
                                    className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium">لم تحدد أي مدن بعد</p>
                        <p className="text-sm">أضف المدن التي تقدم خدماتك فيها</p>
                    </div>
                )}
            </div>

            {/* Add new city */}
            {showAddCity && availableCities.length > 0 && (
                <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 mb-3">إضافة مدينة جديدة:</h4>
                    <div className="space-y-2">
                        {availableCities.map(city => (
                            <button
                                key={city.id}
                                onClick={() => handleToggleCity(city.id)}
                                disabled={isSaving}
                                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <span className="text-gray-800">{city.name}</span>
                                <Plus className="h-4 w-4 text-gray-400" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {supplierCities.length === 0 && availableCities.length === 0 && !isLoading && (
                <div className="text-center py-4 text-gray-500">
                    <p>جميع المدن المتاحة مضافة بالفعل</p>
                </div>
            )}

            {/* Summary */}
            {supplierCities.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                        تقدم خدماتك في <strong>{supplierCities.length}</strong> مدينة
                    </p>
                </div>
            )}
        </div>
    );
};

export default CityManagement;