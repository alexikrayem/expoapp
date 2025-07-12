import React, { useEffect, useState, createContext, useContext } from 'react';
import { 
    BrowserRouter as Router, 
    Routes, 
    Route, 
    Navigate, 
    Outlet, 
    useLocation, 
    useNavigate 
} from 'react-router-dom';

// Import Page Components
import LoginPage from './pages/LoginPage';
import AssignedOrdersPage from './pages/AssignedOrdersPage';
// Import OrderItemDetailPage when you create it
// import OrderItemDetailPage from './pages/OrderItemDetailPage'; 

// Import API client
import apiClient from './services/api'; 

// Import Icons for Layout (if needed directly in layout, otherwise keep in specific pages)
import { LogOut, Menu, Bell } from 'lucide-react'; // Example icons for layout

// --- Auth Context ---
const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const AuthProvider = ({ children }) => {
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('deliveryAgentToken'));
    const [agentInfo, setAgentInfo] = useState(() => {
        const info = localStorage.getItem('deliveryAgentInfo');
        try { return info ? JSON.parse(info) : null; } catch (e) { return null; }
    });

    useEffect(() => {
        const attemptTelegramLogin = async () => {
            const tg = window.Telegram?.WebApp;
            if (tg && tg.initData && !authToken) { // Only if not already logged in via stored token
                console.log("[Auth] No local token. Attempting Telegram login with initData...");
                try {
                    const response = await apiClient.post('/api/auth/delivery/verify-telegram', { initData: tg.initData });
                    localStorage.setItem('deliveryAgentToken', response.data.token);
                    localStorage.setItem('deliveryAgentInfo', JSON.stringify(response.data.agent));
                    setAuthToken(response.data.token);
                    setAgentInfo(response.data.agent);
                    console.log("[Auth] Telegram login successful via initData.");
                } catch (error) {
                    console.warn("[Auth] Telegram initData verification/login failed:", error.response?.data?.error || error.message);
                }
            }
            setIsLoadingAuth(false);
        };

        if (authToken) { // If token exists in local storage, assume "logged in" for now
            setIsLoadingAuth(false);
        } else {
            attemptTelegramLogin(); // Otherwise, try TG auto-login
        }
    }, [authToken]); // Re-check if authToken changes (e.g., on logout)

    const login = (token, agentData) => {
        localStorage.setItem('deliveryAgentToken', token);
        localStorage.setItem('deliveryAgentInfo', JSON.stringify(agentData));
        setAuthToken(token);
        setAgentInfo(agentData);
        setIsLoadingAuth(false);
    };

    const logout = () => {
        localStorage.removeItem('deliveryAgentToken');
        localStorage.removeItem('deliveryAgentInfo');
        setAuthToken(null);
        setAgentInfo(null);
        setIsLoadingAuth(false);
    };

    const contextValue = {
        authToken,
        agentInfo,
        login,
        logout,
        isAuthenticated: !!authToken,
        isLoadingAuth
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
// --- End Auth Context ---


// --- Layout for Authenticated Routes ---
const DeliveryAppLayout = () => {
    const navigate = useNavigate();
    const { agentInfo, logout: authLogout } = useAuth();

    const handleLogout = () => {
        authLogout();
        // The ProtectedRoutes or AuthRedirector will handle navigation to /login
        // but an explicit navigate here can feel more immediate.
        navigate('/login', { replace: true }); 
    };

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            // Set theme colors based on Telegram theme or your app's dark theme
            const bgColor = '#111827'; // e.g., gray-900
            const headerColor = '#1f2937'; // e.g., gray-800
            
            if (tg.isVersionAtLeast('6.1')) {
                tg.setHeaderColor(headerColor);
                tg.setBackgroundColor(bgColor);
            }
            // MainButton can be configured per page/view if needed
            tg.MainButton.hide(); 
            // BackButton should be managed by individual pages that need it (like OrderItemDetailPage)
            tg.BackButton.hide();

            console.log("[TMA Layout] SDK Ready. Agent:", agentInfo?.name, "TG User:", tg.initDataUnsafe.user?.username);
        } else {
            console.log("[TMA Layout] Telegram SDK not found.");
        }
    }, [agentInfo]); // Re-run if agentInfo changes (e.g., after login)

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <header className="bg-gray-800 shadow-md p-3 sm:p-4 flex justify-between items-center sticky top-0 z-50">
                {/* Optional: Menu button for future mobile sidebar */}
                {/* <button className="p-2 text-gray-400 hover:text-white md:hidden"> <Menu size={24}/> </button> */}
                <h1 className="text-lg sm:text-xl font-semibold text-sky-400">مهام التوصيل</h1>
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse"> {/* RTL spacing */}
                    {agentInfo && <span className="text-xs sm:text-sm text-gray-400 hidden sm:block">أهلاً, {agentInfo.name}</span>}
                    {/* Optional: Notification Bell */}
                    {/* <button className="p-2 text-gray-400 hover:text-white relative"> <Bell size={20}/> <span className="absolute top-1 right-1 bg-red-500 h-2 w-2 rounded-full"></span> </button> */}
                    <button 
                        onClick={handleLogout} 
                        title="تسجيل الخروج"
                        className="text-xs bg-red-500 hover:bg-red-600 text-white py-1.5 px-2.5 sm:px-3 rounded-md shadow-sm flex items-center gap-1"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">خروج</span>
                    </button>
                </div>
            </header>
            <main className="flex-grow p-3 sm:p-4 overflow-y-auto"> {/* Ensure content area can scroll independently */}
                <Outlet /> {/* Routed components render here */}
            </main>
            {/* Optional: Bottom Navigation for TMA if needed later */}
        </div>
    );
};


// --- Protected Routes Logic ---
const ProtectedRoutes = () => {
    const { isAuthenticated, isLoadingAuth } = useAuth();
    const location = useLocation();

    if (isLoadingAuth) {
        return ( // Consistent FullScreenLoader
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-sky-400 p-4">
                <svg className="animate-spin h-8 w-8 text-sky-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>جاري التحقق من صلاحية الدخول...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Outlet />; // Render Outlet which will be wrapped by DeliveryAppLayout in parent Route
};


// --- Main App Component with Routing ---
function App() {
    // Basename is usually not needed for TMAs served from the root of their URL.
    // If deploying to a subfolder like yourdomain.com/delivery-app/, then set basename="/delivery-app".
    const basename = "/"; 

    return (
        <Router basename={basename}>
            <AuthProvider> {/* AuthProvider wraps all routes */}
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Routes that require authentication are nested under a parent Route that uses ProtectedRoutes logic */}
                    <Route element={<ProtectedRoutes />}> {/* This route checks auth */}
                        <Route element={<DeliveryAppLayout />}> {/* This route provides layout for authenticated pages */}
                            <Route path="/" element={<AssignedOrdersPage />} />
                            {/* Add route for OrderItemDetailPage when ready */}
                            {/* <Route path="/order-item/:orderItemId" element={<OrderItemDetailPage />} /> */}
                        </Route>
                    </Route>
                    
                    <Route path="*" element={<AuthRedirector />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

// Helper component for '*' route to ensure redirection logic uses auth state from context
const AuthRedirector = () => {
    const { isAuthenticated, isLoadingAuth } = useAuth();

    if (isLoadingAuth) {
        // You might want a minimal loader here or just let it briefly show nothing
        return (
             <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-sky-400 p-4">
                <svg className="animate-spin h-8 w-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }
    return <Navigate to={isAuthenticated ? "/" : "/login"} replace />;
};

export default App;