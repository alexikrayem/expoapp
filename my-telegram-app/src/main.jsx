import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ReactDOM from 'react-dom/client';
import React from 'react';
import App from './App.jsx'
import { CurrencyProvider } from './context/CurrencyContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CurrencyProvider>  {/* <-- WRAPPER START */}
      <App />
    </CurrencyProvider> {/* <-- WRAPPER END */}
  </React.StrictMode>,
);
