import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-ionicons';

// Import screen components
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import DealsScreen from '../screens/DealsScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SupplierDetailScreen from '../screens/SupplierDetailScreen';
import DealDetailScreen from '../screens/DealDetailScreen';
import FeaturedListScreen from '../screens/FeaturedListScreen';

// Define navigation param lists
type ProductsStackParamList = {
  ProductsList: undefined;
  ProductDetail: { id: string };
};

type DealsStackParamList = {
  DealsList: undefined;
  DealDetail: { id: string };
};

type SuppliersStackParamList = {
  SuppliersList: undefined;
  SupplierDetail: { id: string };
};

type RootTabParamList = {
  Deals: undefined;
  Products: undefined;
  Suppliers: undefined;
};

type AppStackParamList = {
  MainTabs: undefined;
};

const ProductsStack = createNativeStackNavigator<ProductsStackParamList>();
const DealsStack = createNativeStackNavigator<DealsStackParamList>();
const SuppliersStack = createNativeStackNavigator<SuppliersStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

// Simple wrappers that cast props to any to avoid cross-stack navigation type incompatibilities
const ProductDetailScreenWrapper = (
  props: NativeStackScreenProps<ProductsStackParamList, 'ProductDetail'>
) => {
  return <ProductDetailScreen {...(props as unknown as any)} />;
};

const DealDetailScreenWrapper = (props: NativeStackScreenProps<DealsStackParamList, 'DealDetail'>) => {
  return <DealDetailScreen {...(props as unknown as any)} />;
};

const SupplierDetailScreenWrapper = (
  props: NativeStackScreenProps<SuppliersStackParamList, 'SupplierDetail'>
) => {
  return <SupplierDetailScreen {...(props as unknown as any)} />;
};

const ProductsStackScreen = () => {
  return (
    <ProductsStack.Navigator>
      <ProductsStack.Screen
        name="ProductsList"
        component={ProductsScreen}
        options={{ headerShown: false }}
      />
      <ProductsStack.Screen
        name="ProductDetail"
        component={ProductDetailScreenWrapper}
        options={{
          title: 'Product Details',
          headerShown: true,
        }}
      />
    </ProductsStack.Navigator>
  );
};

const DealsStackScreen = () => {
  return (
    <DealsStack.Navigator>
      <DealsStack.Screen
        name="DealsList"
        component={DealsScreen}
        options={{ headerShown: false }}
      />
      <DealsStack.Screen
        name="DealDetail"
        component={DealDetailScreenWrapper}
        options={{
          title: 'Deal Details',
          headerShown: true,
        }}
      />
    </DealsStack.Navigator>
  );
};

const SuppliersStackScreen = () => {
  return (
    <SuppliersStack.Navigator>
      <SuppliersStack.Screen
        name="SuppliersList"
        component={SuppliersScreen}
        options={{ headerShown: false }}
      />
      <SuppliersStack.Screen
        name="SupplierDetail"
        component={SupplierDetailScreenWrapper}
        options={{
          title: 'Supplier Details',
          headerShown: true,
        }}
      />
    </SuppliersStack.Navigator>
  );
};

// Tab Navigator Component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Products"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse';

          if (route.name === 'Deals') {
            iconName = focused ? 'pricetags' : 'pricetags-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Suppliers') {
            iconName = focused ? 'business' : 'business-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6', // blue-500
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Deals"
        component={DealsStackScreen}
        options={{
          tabBarLabel: 'العروض',
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsStackScreen}
        options={{
          tabBarLabel: 'المنتجات',
        }}
      />
      <Tab.Screen
        name="Suppliers"
        component={SuppliersStackScreen}
        options={{
          tabBarLabel: 'الموردون',
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;