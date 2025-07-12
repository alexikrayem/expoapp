// src/components/modals/CitySelectionModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building } from 'lucide-react';
import { cityService } from '../../services/cityService';

const CitySelectionModal = ({ show, onCitySelect }) => {
    const [availableCities, setAvailableCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            const fetchCities = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await cityService.getCities();
                    setAvailableCities(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCities();
        }
    }, [show]);

    if (!show) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-6 text-white text-center" dir="rtl">
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <Building className="h-20 w-20 mx-auto text-blue-400 mb-6" />
                <h1 className="text-3xl font-bold mb-3">مرحباً بك في معرضنا</h1>
                <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
                    لتجربة أفضل، يرجى تحديد مدينتك لعرض المنتجات والعروض المتوفرة في منطقتك.
                </p>

                <div className="w-full max-w-xs mx-auto">
                    {isLoading ? (
                        <div className="h-14 bg-gray-700 rounded-lg animate-pulse"></div>
                    ) : error ? (
                        <p className="text-red-400">{error}</p>
                    ) : (
                        <div className="relative">
                            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                onChange={(e) => {
                                    const selectedOption = e.target.options[e.target.selectedIndex];
                                    const cityId = selectedOption.value;
                                    const cityName = selectedOption.text;
                                    onCitySelect({ cityId, cityName });
                                }}
                                defaultValue=""
                                className="w-full pl-4 pr-12 py-4 bg-gray-800 border border-gray-600 rounded-lg text-white text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="" disabled>-- اختر مدينتك --</option>
                                {availableCities.map(city => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CitySelectionModal;