// src/components/DeliveryAgentFormModal.jsx - Form for creating/editing delivery agents
import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react';

const DeliveryAgentFormModal = ({ isOpen, onClose, onSave, agentToEdit, isLoading }) => {
    const initialFormState = {
        full_name: '',
        phone_number: '',
        email: '',
        telegram_user_id: '',
        password: '',
        is_active: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');
    const isEditMode = !!agentToEdit;

    useEffect(() => {
        if (agentToEdit) {
            setFormData({
                full_name: agentToEdit.full_name || '',
                phone_number: agentToEdit.phone_number || '',
                email: agentToEdit.email || '',
                telegram_user_id: agentToEdit.telegram_user_id || '',
                password: '', // Don't pre-fill password for editing
                is_active: agentToEdit.is_active !== undefined ? agentToEdit.is_active : true,
            });
        } else {
            setFormData(initialFormState);
        }
        setError('');
    }, [isOpen, agentToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.full_name.trim()) {
            setError('الاسم الكامل مطلوب');
            return;
        }
        if (!formData.phone_number.trim()) {
            setError('رقم الهاتف مطلوب');
            return;
        }
        if (!isEditMode && !formData.password.trim()) {
            setError('كلمة المرور مطلوبة للمندوبين الجدد');
            return;
        }
        if (!isEditMode && formData.password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        const payload = {
            full_name: formData.full_name.trim(),
            phone_number: formData.phone_number.trim(),
            email: formData.email.trim() || null,
            telegram_user_id: formData.telegram_user_id.trim() || null,
            is_active: formData.is_active,
        };

        // Only include password for new agents
        if (!isEditMode && formData.password.trim()) {
            payload.password = formData.password;
        }

        try {
            await onSave(payload, agentToEdit?.id);
        } catch (apiError) {
            setError(apiError.message || 'حدث خطأ أثناء الحفظ');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {isEditMode ? 'تعديل مندوب التوصيل' : 'إضافة مندوب توصيل جديد'}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="full_name" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <User className="h-4 w-4" />
                            الاسم الكامل
                        </label>
                        <input
                            type="text"
                            name="full_name"
                            id="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="أدخل الاسم الكامل"
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label htmlFor="phone_number" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Phone className="h-4 w-4" />
                            رقم الهاتف
                        </label>
                        <input
                            type="tel"
                            name="phone_number"
                            id="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="05xxxxxxxx"
                        />
                    </div>

                    {/* Email (Optional) */}
                    <div>
                        <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Mail className="h-4 w-4" />
                            البريد الإلكتروني (اختياري)
                        </label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="agent@example.com"
                        />
                    </div>

                    {/* Telegram User ID (Optional) */}
                    <div>
                        <label htmlFor="telegram_user_id" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <MessageCircle className="h-4 w-4" />
                            معرف تيليجرام (اختياري)
                        </label>
                        <input
                            type="text"
                            name="telegram_user_id"
                            id="telegram_user_id"
                            value={formData.telegram_user_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="@username أو معرف رقمي"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            سيتم استخدامه لإرسال إشعارات الطلبات الجديدة
                        </p>
                    </div>

                    {/* Password (only for new agents) */}
                    {!isEditMode && (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                كلمة المرور الأولية
                            </label>
                            <input
                                type="password"
                                name="password"
                                id="password"
                                value={formData.password}
                                onChange={handleChange}
                                required={!isEditMode}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="كلمة مرور قوية"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                سيتمكن المندوب من تغييرها لاحقاً
                            </p>
                        </div>
                    )}

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="is_active"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                            مندوب نشط (يمكنه استلام طلبات جديدة)
                        </label>
                    </div>

                    {/* Submit buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    جاري الحفظ...
                                </>
                            ) : (
                                isEditMode ? 'حفظ التعديلات' : 'إضافة المندوب'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeliveryAgentFormModal;