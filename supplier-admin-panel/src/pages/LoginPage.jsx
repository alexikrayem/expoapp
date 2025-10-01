// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (localStorage.getItem('supplierToken')) {
            navigate('/', { replace: true });
        }
    }, [navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        console.log('🔐 Attempting supplier login...');
        
        try {
            const apiBaseUrl = import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001'; // Ensure .env is set up
            console.log('📡 API Base URL:', apiBaseUrl);
            
            const response = await axios.post(`${apiBaseUrl}/api/auth/supplier/login`, {
                email: email.toLowerCase().trim(), // Normalize email
                password,
            });
            
            console.log('✅ Login successful, storing tokens...');
            
            localStorage.setItem('supplierToken', response.data.token);
            localStorage.setItem('supplierInfo', JSON.stringify(response.data.supplier));
            
            const fromLocationState = location.state?.from;
            let redirectTo = "/"; // Default redirect path
             if (fromLocationState) {
                // If 'from' was an object with pathname, search, hash
                if (typeof fromLocationState === 'object' && fromLocationState.pathname) {
                    redirectTo = fromLocationState.pathname + (fromLocationState.search || '') + (fromLocationState.hash || '');
                } 
                // If 'from' was just a string (pathname)
                else if (typeof fromLocationState === 'string') {
                    redirectTo = fromLocationState;
                }
            }
            
            console.log('🔄 Redirecting to:', redirectTo);
            navigate(redirectTo, { replace: true });


        } catch (err) {
            console.error('❌ Login error:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105">
                <h2 className="text-3xl font-bold text-center text-slate-700 mb-8">لوحة تحكم المورد</h2>
                {error && <p className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-2" htmlFor="email">البريد الإلكتروني</label>
                        <input
                            type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-2" htmlFor="password">كلمة المرور</label>
                        <input
                            type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'تسجيل الدخول'}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default LoginPage;