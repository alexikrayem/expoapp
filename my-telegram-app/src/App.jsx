import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalProvider } from './context/ModalContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Skeleton from './components/common/Skeleton';

// Layout and Pages
import AppInitializer from './AppInitializer';
import AppLayout from './components/layout/AppLayout';

// Lazy Load Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const FavoritesPage = React.lazy(() => import('./pages/FavoritesPage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            cacheTime: 1000 * 60 * 30, // 30 minutes
            refetchOnWindowFocus: false,
        },
    },
});

// Loading Fallback
const PageLoader = () => (
    <div className="p-4 space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    </div>
);

function App() {
    return (
        <div className="App">
            <QueryClientProvider client={queryClient}>
                {/* These providers do NOT depend on user data, so they can live on the outside. */}
                <CurrencyProvider>
                    <ModalProvider>
                        <Router>
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    {/* AppInitializer will now render the rest of the providers inside it */}
                                    <Route element={<AppInitializer />}>
                                        <Route path="/login" element={<LoginPage />} />
                                        <Route element={<AppLayout />}>
                                            <Route path="/" element={<HomePage />} />
                                            <Route path="/favorites" element={<FavoritesPage />} />
                                            <Route path="/orders" element={<OrdersPage />} />
                                            <Route path="/settings" element={<SettingsPage />} />
                                        </Route>
                                    </Route>
                                </Routes>
                            </Suspense>
                        </Router>
                    </ModalProvider>
                </CurrencyProvider>
            </QueryClientProvider>
        </div>
    );
}

export default App;