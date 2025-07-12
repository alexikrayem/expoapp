import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/api'; // Your configured axios instance from src/services/api.js
import { useAuth } from '../App'; // Assuming useAuth is exported from src/App.jsx

// A simple loader component (can be moved to a shared components folder)
const FullScreenLoader = ({ message = "جاري التحميل..." }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-sky-400 p-4">
        <svg className="animate-spin h-8 w-8 text-sky-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{message}</p>
    </div>
);

const LoginPage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // For the form's submit button loading state

    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth(); // Get the whole auth object from context

    // Effect to redirect if already authenticated, after initial auth check is done
    useEffect(() => {
        if (auth && !auth.isLoadingAuth && auth.isAuthenticated) {
            const from = location.state?.from?.pathname || "/";
            console.log("[LoginPage] Already authenticated by context, redirecting to:", from);
            navigate(from, { replace: true });
        }
    }, [auth, navigate, location.state]);

    const handlePhoneNumberChange = (e) => {
        setPhoneNumber(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!auth || !auth.login) {
            console.error("[LoginPage] Auth context or login function is not available at submit time.");
            setError("Login system error. Please refresh and try again.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await apiClient.post('/api/auth/delivery/login', {
                phoneNumber: phoneNumber.trim(),
                password: password, // Send plain password, backend will hash and compare
            });
            
            // Call the login function from AuthContext
            auth.login(response.data.token, response.data.agent);
            
            // Navigation will now primarily be handled by the useEffect above reacting to auth.isAuthenticated
            // or by ProtectedRoutes. For an immediate feel:
            const from = location.state?.from?.pathname || "/";
            navigate(from, { replace: true });

        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Login failed. Please check your credentials or network connection.';
            setError(errorMessage);
            console.error("[LoginPage] Login submission error:", err.response || err.message || err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // If AuthProvider is still doing its initial check (e.g., Telegram auto-login)
    if (auth && auth.isLoadingAuth) {
        return <FullScreenLoader message="جاري تهيئة التطبيق..." />;
    }

    // If already authenticated by context and useEffect hasn't redirected yet (should be rare)
    if (auth && auth.isAuthenticated) {
        return <FullScreenLoader message="إعادة توجيه..." />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4" dir="rtl">
            <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-xs sm:max-w-sm"> {/* Adjusted max-w */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-sky-400">مندوب التوصيل</h1>
                    <p className="text-gray-400 text-sm mt-1">تسجيل الدخول للمتابعة</p>
                </div>

                {error && (
                    <p className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2.5 rounded-md mb-4 text-xs text-center">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-1.5" htmlFor="phoneNumber">
                            رقم الهاتف
                        </label>
                        <input
                            type="tel" 
                            id="phoneNumber" 
                            value={phoneNumber} 
                            onChange={handlePhoneNumberChange} // Using dedicated handler
                            required
                            className="form-input-dark" // Defined in index.css
                            placeholder="05xxxxxxxx"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-300 text-xs font-semibold mb-1.5" htmlFor="password">
                            كلمة المرور
                        </label>
                        <input
                            type="password" 
                            id="password" 
                            value={password} 
                            onChange={handlePasswordChange} // Using dedicated handler
                            required
                            className="form-input-dark"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-sky-500 hover:bg-sky-600 focus:ring-sky-400 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
                    >
                        {isSubmitting ? (
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