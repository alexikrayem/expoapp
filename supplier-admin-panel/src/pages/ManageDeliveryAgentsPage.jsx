// src/pages/ManageDeliveryAgentsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, PlusCircle, Edit3, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import DeliveryAgentFormModal from '../components/DeliveryAgentFormModal'; // Import the modal

// Axios instance (can be shared from a service file)
const getAuthToken = () => localStorage.getItem('supplierToken');
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001',
});
apiClient.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, error => Promise.reject(error));


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
            const response = await apiClient.get('/api/supplier/delivery-agents');
            setAgents(response.data.items || response.data || []); // Handle if backend returns array directly or {items: [...]}
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch delivery agents.');
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
                await apiClient.put(`/api/supplier/delivery-agents/${agentIdToEdit}`, agentData);
            } else {
                await apiClient.post('/api/supplier/delivery-agents', agentData);
            }
            setShowModal(false);
            fetchDeliveryAgents(); // Refresh list
        } catch (err) {
            console.error("Save agent error:", err.response?.data?.error || err.message);
            throw new Error(err.response?.data?.error || 'Failed to save delivery agent.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAgent = async (agentId, agentName) => {
        if (window.confirm(`Are you sure you want to delete delivery agent "${agentName}"?`)) {
            setIsLoading(true); // Or a specific deleting state
            try {
                await apiClient.delete(`/api/supplier/delivery-agents/${agentId}`);
                fetchDeliveryAgents();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete agent.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleToggleAgentStatus = async (agentId, currentStatus) => {
        // This PUT endpoint for toggling status for supplier's own agent needs to be created in backend
        // PUT /api/supplier/delivery-agents/:agentId/toggle-active
        if (window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this agent?`)) {
            try {
                 const response = await apiClient.put(`/api/supplier/delivery-agents/${agentId}/toggle-active`); // Example endpoint
                 setAgents(prevAgents => 
                     prevAgents.map(a => a.id === agentId ? response.data : a)
                 );
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to update agent status.');
            }
        }
    };


    if (isLoading && agents.length === 0) return <div className="p-10 text-center">Loading delivery agents...</div>;
    if (error && agents.length === 0) return <div className="p-4 m-4 bg-red-100 text-red-700 rounded">{error}</div>;

    return (
        <div> {/* Removed container mx-auto, parent AdminLayout handles padding */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <Users size={28} className="mr-3 text-teal-600" /> {/* ml-3 for RTL */}
                    مندوبي التوصيل
                </h2>
                <button onClick={handleAddAgent} className="btn-primary bg-teal-600 hover:bg-teal-700 focus:ring-teal-500">
                    <PlusCircle size={20} className="mr-2" /> {/* ml-2 for RTL */}
                    إضافة مندوب
                </button>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">{error}</p>}

            {agents.length === 0 && !isLoading ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <p className="text-gray-600">لم تقم بإضافة أي مندوبي توصيل بعد.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="th-cell">الاسم الكامل</th>
                                <th className="th-cell">رقم الهاتف</th>
                                <th className="th-cell">البريد الإلكتروني</th>
                                <th className="th-cell">معرف تيليجرام</th>
                                <th className="th-cell">الحالة</th>
                                <th className="th-cell">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {agents.map(agent => (
                                <tr key={agent.id} className="hover:bg-gray-50">
                                    <td className="td-cell font-medium text-gray-900">{agent.full_name}</td>
                                    <td className="td-cell">{agent.phone_number}</td>
                                    <td className="td-cell">{agent.email || '-'}</td>
                                    <td className="td-cell">{agent.telegram_user_id || '-'}</td>
                                    <td className="td-cell">
                                        <button onClick={() => handleToggleAgentStatus(agent.id, agent.is_active)}
                                            title={agent.is_active ? "Click to Deactivate" : "Click to Activate"}
                                            className={`p-1 rounded-full ${agent.is_active ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}`}
                                        >
                                            {agent.is_active ? <ToggleRight size={22}/> : <ToggleLeft size={22}/>}
                                        </button>
                                        <span className={`ml-2 text-xs font-semibold ${agent.is_active ? 'text-green-700' : 'text-red-700'}`}> {/* mr-2 for RTL */}
                                            {agent.is_active ? 'فعال' : 'غير فعال'}
                                        </span>
                                    </td>
                                    <td className="td-cell space-x-2 space-x-reverse"> {/* For RTL */}
                                        <button onClick={() => handleEditAgent(agent)} title="Edit Agent" className="text-indigo-600 hover:text-indigo-800 p-1"><Edit3 size={18}/></button>
                                        <button onClick={() => handleDeleteAgent(agent.id, agent.full_name)} title="Delete Agent" className="text-red-600 hover:text-red-800 p-1"><Trash2 size={18}/></button>
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
                    onClose={() => { setShowModal(false); setEditingAgent(null); }}
                    onSave={handleSaveAgent}
                    agentToEdit={editingAgent}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
// Helper styles for table cells, add to index.css or use directly
// @layer components {
//  .th-cell { @apply px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider; }
//  .td-cell { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-500; }
// }
export default ManageDeliveryAgentsPage;