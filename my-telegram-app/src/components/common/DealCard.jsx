// src/components/common/DealCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const DealCard = ({ deal, onShowDetails }) => (
    <motion.div
        className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.02 }}
        onClick={() => onShowDetails(deal.id)}
    >
        <div className="h-36 w-full flex items-center justify-center text-white p-4" style={{ background: deal.image_url || 'linear-gradient(to right, #f59e0b, #d97706)' }}>
            <div className="text-center">
                <div className="text-3xl font-bold mb-1">{deal.discount_percentage ? `خصم ${deal.discount_percentage}%` : 'عرض خاص'}</div>
                <div className="text-sm opacity-90">{deal.title}</div>
            </div>
        </div>
        <div className="p-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{deal.supplier_name || 'المنصة'}</span>
                <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>ينتهي في {new Date(deal.end_date).toLocaleDateString('ar-EG')}</span>
                </div>
            </div>
        </div>
    </motion.div>
);

export default DealCard;