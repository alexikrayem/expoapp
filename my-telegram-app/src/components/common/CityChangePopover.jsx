// src/components/common/CityChangePopover.jsx
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cityService } from '../../services/cityService';

const CityChangePopover = ({ onCitySelect, currentCityId, onClose }) => {
    const [availableCities, setAvailableCities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const popoverRef = useRef(null);

    const [popoverPosition, setPopoverPosition] = useState({
        top: 'top-full',
        right: 'right-0',
        left: 'auto',
    });

    useEffect(() => {
        const fetchCities = async () => {
            setIsLoading(true);
            try {
                const data = await cityService.getCities();
                setAvailableCities(data);
            } catch (err) {
                console.error("Failed to fetch cities for popover:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCities();
    }, []);

    useLayoutEffect(() => {
        if (popoverRef.current) {
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newPosition = { ...popoverPosition };

            if (popoverRect.right > viewportWidth) {
                newPosition.right = 'auto';
                newPosition.left = 'left-0';
            }
            
            if (popoverRect.left < 0) {
                newPosition.left = 'left-0';
                newPosition.right = 'auto';
            }
            
            if (popoverRect.bottom > viewportHeight) {
                newPosition.top = 'bottom-full';
            }
            
            setPopoverPosition(newPosition);
        }
    }, [isLoading]);

    const handleSelect = (city) => {
        onCitySelect(city);
        onClose();
    };

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-30"></div>
            
            <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute mt-2 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 ${popoverPosition.top} ${popoverPosition.right} ${popoverPosition.left}`}
                style={{
                    visibility: isLoading ? 'hidden' : 'visible'
                }}
            >
                <div className="p-2">
                    <h3 className="px-3 py-2 text-sm font-semibold text-gray-500">اختر مدينتك</h3>
                    <div className="max-h-60 overflow-y-auto">
                        {isLoading ? (
                            <div className="space-y-1 p-2">
                                <div className="h-6 bg-gray-200 rounded-md animate-pulse"></div>
                                <div className="h-6 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: '100ms' }}></div>
                                <div className="h-6 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: '200ms' }}></div>
                            </div>
                        ) : (
                            availableCities.map(city => (
                                <button
                                    key={city.id}
                                    onClick={() => handleSelect(city)}
                                    className="w-full text-right flex items-center justify-between px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    <span>{city.name}</span>
                                    {currentCityId === city.id && (
                                        <Check className="h-4 w-4 text-blue-600" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default CityChangePopover;