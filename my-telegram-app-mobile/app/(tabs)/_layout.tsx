import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Heart, ShoppingBag, Settings } from 'lucide-react-native';
import MiniCart from '@/components/MiniCart';
import Header from '@/components/Header';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          header: () => <Header />,
          headerShown: true,
          tabBarHideOnKeyboard: true,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'الرئيسية',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'المفضلة',
            tabBarIcon: ({ color, focused }) => <Heart size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'طلباتي',
            tabBarIcon: ({ color, focused }) => <ShoppingBag size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'الإعدادات',
            tabBarIcon: ({ color, focused }) => <Settings size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
          }}
        />
      </Tabs>
      <MiniCart />
    </>
  );
}
