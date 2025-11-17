import React from 'react';
import { SearchProvider } from '../../context/SearchContext';
import { CartProvider } from '../../context/CartContext';
import { FilterProvider } from '../../context/FilterContext';
import { CheckoutProvider } from '../../context/CheckoutContext';
import { MiniCartProvider } from '../../context/MiniCartContext';
import { CacheProvider } from '../../context/CacheContext';
import { Outlet } from 'react-router-dom';

const MainAppLayout = ({ telegramUser, userProfile, onProfileUpdate }) => {
  return (
    <CacheProvider>
      <MiniCartProvider>
        <CartProvider user={telegramUser || (userProfile ? {id: userProfile.userId} : null)}>
          <SearchProvider cityId={userProfile?.selected_city_id}>
            <FilterProvider>
              <CheckoutProvider>
                <Outlet
                  context={{
                    telegramUser,
                    userProfile,
                    onProfileUpdate,
                  }}
                />
              </CheckoutProvider>
            </FilterProvider>
          </SearchProvider>
        </CartProvider>
      </MiniCartProvider>
    </CacheProvider>
  );
};

export default MainAppLayout;