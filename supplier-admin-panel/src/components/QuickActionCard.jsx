import React from 'react';

const QuickActionCard = ({ title, description, icon: Icon, color, onClick, disabled, count }) => {
    const colorClasses = {
        green: 'border-green-300 hover:border-green-400 hover:bg-green-50',
        orange: 'border-orange-300 hover:border-orange-400 hover:bg-orange-50',
        blue: 'border-blue-300 hover:border-blue-400 hover:bg-blue-50',
    };

    const iconColorClasses = {
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        blue: 'bg-blue-100 text-blue-600',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 text-right
                ${disabled
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : `${colorClasses[color]} hover:shadow-md`
                }
            `}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${iconColorClasses[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{title}</h4>
                    <p className="text-sm text-gray-600">{description}</p>
                    {count !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">({count} منتج)</p>
                    )}
                </div>
            </div>
        </button>
    );
};

export default QuickActionCard;
