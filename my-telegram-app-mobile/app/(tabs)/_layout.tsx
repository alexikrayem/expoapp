import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Heart, ShoppingBag } from 'lucide-react-native';
import MiniCart from '@/components/MiniCart';
import Header from '@/components/Header';
import CustomTabBar from '@/components/CustomTabBar';
import AIChatOverlay from '@/components/AIChatOverlay';
import { AIChatProvider, useAIChat } from '@/context/AIChatContext';

function TabNavigator() {
  const { isAIMode } = useAIChat();

  return (
    <>
      <AIChatOverlay visible={isAIMode} />
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          header: () => <Header />,
          headerShown: true,
          // Hide tab bar when keyboard opens to avoid conflicts with AI input
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
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

export default function TabLayout() {
  return (
    <AIChatProvider>
      <TabNavigator />
      <MiniCart />
    </AIChatProvider>
  );
}
