import React from 'react';
import { TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, isLoading }) => (
    <div
        className="bg-white rounded-lg shadow-sm p-6 border-l-4 transition-all hover:shadow-md"
        style={{ borderLeftColor: color }}
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                ) : (
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                )}
                {subtitle && !isLoading && (
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>
            <div
                className="p-3 rounded-full"
                style={{ backgroundColor: `${color}20` }}
            >
                <Icon className="h-6 w-6" style={{ color }} />
            </div>
        </div>
        {trend !== undefined && !isLoading && (
            <div className="mt-4 flex items-center">
                <TrendingUp
                    className={`h-4 w-4 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}
                />
                <span className={`text-sm mr-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}% من الأسبوع الماضي
                </span>
            </div>
        )}
    </div>
);

export default StatCard;
