// src/App.jsx (CORRECTED)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModalProvider } from './context/ModalContext';
import { CurrencyProvider } from './context/CurrencyContext';

// Layout and Pages
import AppInitializer from './AppInitializer';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import FavoritesPage from './pages/FavoritesPage';
import OrdersPage from './pages/OrdersPage';

function App() {
    return (
        // FIX: Add this wrapper div. This is the element our CSS in index.css
        // will turn into the main flexbox container for our sticky footer layout.
        <div className="App">
            <CurrencyProvider>
                <ModalProvider>
                    <Router>
                        <Routes>
                            <Route element={<AppInitializer />}>
                                <Route element={<AppLayout />}>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/favorites" element={<FavoritesPage />} />
                                    <Route path="/orders" element={<OrdersPage />} />
                                </Route>
                            </Route>
                        </Routes>
                    </Router>
                </ModalProvider>
            </CurrencyProvider>
        </div>
    );
}

export default App;