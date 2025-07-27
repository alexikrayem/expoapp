// src/components/layout/AppLayout.jsx (FINAL LAYOUT VERSION)
import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import Footer from './Footer';

const AppLayout = () => {
    const context = useOutletContext();

    return (
        // This div is now a full-height flexbox column.
        // `h-screen` makes it take up the entire viewport height.
        <div className="flex flex-col h-screen bg-gray-50">
            {/* The Header is the first item in the flex container. */}
         

            {/* 
              This is the main content area.
              `flex-grow`: Tells this div to expand and fill all available vertical space.
              `overflow-y-auto`: Makes ONLY this div scrollable if its content is too tall.
            */}
            <main className="flex-grow overflow-y-auto">
                <Outlet context={context} />
            </main>

            {/* The Footer is the last item. It will be pushed to the bottom. */}
            <Footer />
        </div>
    );
};

export default AppLayout;