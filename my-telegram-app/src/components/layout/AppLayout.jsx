// src/components/layout/AppLayout.jsx (DEFINITIVE CORRECTED VERSION)
import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import Footer from './Footer';
import FloatingUI from './FloatingUI'; // FIX: Import the new wrapper component

const AppLayout = () => {
    const context = useOutletContext();

    return (
        <>
            <main className="flex-grow">
                <Outlet context={context} />
            </main>
            
            {/* 
              FIX: Render the FloatingUI component here. It will internally
              render the MiniCartBar with all the correct props.
            */}
            <FloatingUI />
            
            <Footer />
        </>
    );
};

export default AppLayout;