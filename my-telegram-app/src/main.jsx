import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from 'react-dom/client';
import React from 'react';
import App from './App.jsx'
import './index.css';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
