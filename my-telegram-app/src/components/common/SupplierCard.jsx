// src/components/common/SupplierCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';

const SupplierCard = ({ supplier, onShowDetails }) => (
    <motion.div
        className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.02 }}
        onClick={() => onShowDetails(supplier.id)}
    >
        <div className="h-24 w-full flex items-center justify-center text-white" style={{ background: supplier.image_url || 'linear-gradient(to right, #3b82f6, #1d4ed8)' }}>
            <h3 className="text-lg font-bold">{supplier.name}</h3>
        </div>
        <div className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-600">{supplier.category || 'غير مصنف'}</span>
                {supplier.rating && (
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current"/>
                        <span>{supplier.rating}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center text-sm text-gray-600 gap-1">
                <MapPin className="h-4 w-4"/>
                <span>{supplier.location || 'غير محدد'}</span>
            </div>
        </div>
    </motion.div>
);

export default SupplierCard;