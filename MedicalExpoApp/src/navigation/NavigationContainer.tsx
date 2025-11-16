import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

const AppNavigationContainer = ({ children }: { children: React.ReactNode }) => {
  return <NavigationContainer>{children}</NavigationContainer>;
};

export default AppNavigationContainer;