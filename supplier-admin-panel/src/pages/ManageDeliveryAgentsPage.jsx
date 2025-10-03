// src/pages/ManageDeliveryAgentsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Users, PlusCircle, Edit3, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import DeliveryAgentFormModal from '../components/DeliveryAgentFormModal';
import { supplierService } from '../services/supplierService';


const ManageDeliveryAgentsPage = () => {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null); // null for Add, object for Edit
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDeliveryAgents = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await supplierService.getDeliveryAgents();
            setAgents(response.items || response || []);
        } catch (err) {
            setError(err.response?.data?.error || 'فشل في تحميل مندوبي التوصيل.');
            setAgents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeliveryAgents();
    }, [fetchDeliveryAgents]);

    const handleAddAgent = () => {
        setEditingAgent(null);
        setShowModal(true);
    };

    const handleEditAgent = (agent) => {
        setEditingAgent(agent);
        setShowModal(true);
    };
    
    const handleSaveAgent = async (agentData, agentIdToEdit) => {
        setIsSubmitting(true);
        try {
            if (agentIdToEdit) {
                await supplierService.updateDeliveryAgent(agentIdToEdit, agentData);
            } else {
                await supplierService.createDeliveryAgent(agentData);
            }
            setShowModal(false);
            fetchDeliveryAgents();

            // Show success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
            notification.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                تم ${agentIdToEdit ? 'تحديث' : 'إضافة'} المندوب بنجاح
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } catch (err) {
            console.error("Save agent error:", err.response?.data?.error || err.message);
            throw new Error(err.response?.data?.error || 'فشل في حفظ المندوب.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAgent = async (agentId, agentName) => {
        if (window.confirm(`هل أنت متأكد من حذف المندوب "${agentName}"؟`)) {
            setIsLoading(true);
            try {
                await supplierService.deleteDeliveryAgent(agentId);
                fetchDeliveryAgents();

                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                notification.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    تم حذف المندوب بنجاح
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            } catch (err) {
                alert(err.response?.data?.error || 'فشل في حذف المندوب.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleToggleAgentStatus = async (agentId, currentStatus) => {
        if (window.confirm(`هل أنت متأكد من ${currentStatus ? 'إلغاء تفعيل' : 'تفعيل'} هذا المندوب؟`)) {
            try {
                const response = await supplierService.toggleDeliveryAgentStatus(agentId);
                setAgents(prevAgents =>
                    prevAgents.map(a => a.id === agentId ? response : a)
                );

                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
                notification.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    تم تحديث حالة المندوب بنجاح
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            } catch (err) {
                alert(err.response?.data?.error || 'فشل في تحديث حالة المندوب.');
            }
        }
    };


    if (isLoading && agents.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل مندوبي التوصيل...</p>
                </div>
            </div>
        );
    }

    if (error && agents.length === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={fetchDeliveryAgents}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                        <Users size={28} className="text-teal-600" />
                        مندوبي التوصيل
                    </h2>
                    <p className="text-gray-600 mt-1">إدارة مندوبي التوصيل الخاصين بمتجرك</p>
                </div>
                <button
                    onClick={handleAddAgent}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md hover:shadow-lg"
                >
                    <PlusCircle size={20} />
                    إضافة مندوب
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {agents.length === 0 && !isLoading ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                    <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">لم تقم بإضافة أي مندوبي توصيل بعد</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        ابدأ بإضافة مندوب توصيل جديد لإدارة عمليات التوصيل
                    </p>
                    <button
                        onClick={handleAddAgent}
                        className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2 transition-colors"
                    >
                        <PlusCircle className="h-5 w-5" />
                        إضافة مندوب جديد
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم الكامل</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الهاتف</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">معرف تيليجرام</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {agents.map(agent => (
                                <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                <Users className="h-5 w-5 text-teal-600" />
                                            </div>
                                            <div className="mr-4">
                                                <div className="text-sm font-medium text-gray-900">{agent.full_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.email || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.telegram_user_id || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleAgentStatus(agent.id, agent.is_active)}
                                            className="flex items-center gap-2 transition-all"
                                        >
                                            {agent.is_active ? (
                                                <>
                                                    <ToggleRight size={24} className="text-green-500" />
                                                    <span className="text-xs font-semibold text-green-700">فعال</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft size={24} className="text-red-500" />
                                                    <span className="text-xs font-semibold text-red-700">غير فعال</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditAgent(agent)}
                                                className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-100 transition-colors"
                                                title="تعديل المندوب"
                                            >
                                                <Edit3 size={18}/>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAgent(agent.id, agent.full_name)}
                                                className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors"
                                                title="حذف المندوب"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <DeliveryAgentFormModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setEditingAgent(null);
                    }}
                    onSave={handleSaveAgent}
                    agentToEdit={editingAgent}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};

export default ManageDeliveryAgentsPage;