// src/pages/AdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { setTokens } from '../api/adminApiClient';

const AdminLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (localStorage.getItem('adminAccessToken')) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3001';
            const response = await axios.post(`${apiBaseUrl}/api/auth/admin/login`, {
                email: email.toLowerCase().trim(),
                password,
            });

            // Handle the new dual token response
            if (response.data.accessToken && response.data.refreshToken) {
                setTokens(response.data.accessToken, response.data.refreshToken);
            } else {
                // Fallback for backward compatibility
                localStorage.setItem('adminAccessToken', response.data.token || response.data.accessToken);
                localStorage.setItem('adminRefreshToken', response.data.refreshToken);
            }
            
            localStorage.setItem('adminInfo', JSON.stringify(response.data.admin));

            const from = location.state?.from?.pathname || "/";
            navigate(from, { replace: true });

        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-800 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-700 mb-8">Platform Admin Login</h2>
                {error && <p className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">Email</label>
                        <input
                            type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">Password</label>
                        <input
                            type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-70"
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default AdminLoginPage;