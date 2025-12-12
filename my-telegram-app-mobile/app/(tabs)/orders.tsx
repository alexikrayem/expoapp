/// <reference types="nativewind/types" />
import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useCurrency } from '@/context/CurrencyContext';
import { orderService } from '@/services/orderService';
import { Clock, CheckCircle, XCircle, Package, Trash2, Plus, Minus } from 'lucide-react-native';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import { Skeleton } from '@/components/ui/Skeleton';

const CheckoutCard = () => {
  const { cartItems, getCartTotal, actions } = useCart();
  const { startCheckout, isPlacingOrder } = useCheckout();
  const { formatPrice } = useCurrency();

  const { userProfile, refreshProfile } = useAuth();
  // We can use userProfile for both, as it contains the necessary info
  const telegramUser = userProfile;

  if (!cartItems || cartItems.length === 0) return null;

  const total = getCartTotal();

  return (
    <View className="bg-white rounded-2xl shadow-sm mb-8 border border-primary-100 overflow-hidden">
      <View className="p-4 bg-primary-50 border-b border-primary-100 flex-row justify-between items-center">
        <View>
          <Text className="text-lg font-bold text-primary-900">سلة التسوق الحالية</Text>
          <Text className="text-xs text-primary-600 font-medium">جاهزة للإرسال</Text>
        </View>
        <View className="bg-white p-2 rounded-full">
          <Package size={20} color="#3b82f6" />
        </View>
      </View>

      <View className="p-4 max-h-60">
        {cartItems.map((item: any) => (
          <View key={item.product_id} className="flex-row items-center mb-4 border-b border-gray-50 pb-3 last:border-0 last:pb-0 last:mb-0">
            <Image
              source={{ uri: item.image_url }}
              className="w-14 h-14 rounded-xl bg-surface"
            />
            <View className="flex-1 mx-3">
              <Text className="font-bold text-sm text-text-main text-right" numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs text-text-secondary text-right mb-1">{item.supplier_name}</Text>
              <Text className="text-primary-600 font-bold text-xs text-right">{formatPrice(item.effective_selling_price)}</Text>
            </View>
            <View className="flex-row items-center bg-surface rounded-lg p-1 border border-border">
              <TouchableOpacity onPress={() => actions.decreaseQuantity(item.product_id)} className="p-1.5 bg-white rounded-md shadow-sm">
                {item.quantity > 1 ? <Minus size={12} color="#374151" /> : <Trash2 size={12} color="#EF4444" />}
              </TouchableOpacity>
              <Text className="mx-3 font-bold text-sm text-text-main">{item.quantity}</Text>
              <TouchableOpacity onPress={() => actions.increaseQuantity(item.product_id)} className="p-1.5 bg-white rounded-md shadow-sm">
                <Plus size={12} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="p-4 bg-surface border-t border-border">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-bold text-text-secondary">المجموع:</Text>
          <Text className="font-bold text-primary-600 text-xl">{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => startCheckout(userProfile, telegramUser, refreshProfile)}
          disabled={isPlacingOrder}
          className={`w-full py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-primary-500/20 active:scale-[0.98] ${isPlacingOrder ? 'bg-gray-300' : 'bg-primary-600'}`}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-lg ml-2">إرسال الطلب</Text>
              <CheckCircle size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const OrderItem = React.memo(({ order, onCancel }: { order: any, onCancel: (id: string) => void }) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'قيد الانتظار', color: '#B45309', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock };
      case 'completed': return { text: 'مكتملة', color: '#059669', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle };
      case 'cancelled': return { text: 'ملغى', color: '#DC2626', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle };
      default: return { text: status, color: '#4B5563', bg: 'bg-gray-50', border: 'border-gray-200', icon: Package };
    }
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <View className="bg-white rounded-3xl shadow-sm mb-5 border border-gray-100 overflow-hidden">
      {/* Header */}
      <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-gray-50/30">
        <View className="items-start">
          <View className={`flex-row items-center px-3 py-1.5 rounded-full ${statusInfo.bg} border ${statusInfo.border} mb-2`}>
            <StatusIcon size={14} color={statusInfo.color} />
            <Text className="text-xs font-bold ml-1.5" style={{ color: statusInfo.color }}>{statusInfo.text}</Text>
          </View>
          <Text className="text-xs text-text-secondary font-medium">{new Date(order.order_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-text-secondary font-medium mb-1">طلب رقم <Text className="font-bold text-text-main">#{String(order.id ?? order.order_id ?? order._id ?? 'Unknown').slice(0, 8)}
          </Text></Text>
          <Text className="font-extrabold text-primary-600 text-lg">{parseFloat(order.total_amount).toFixed(2)} د.إ</Text>
        </View>
      </View>

      {/* Items */}
      <View className="p-5">
        {order.items?.map((item: any, index: number) => (
          <View key={index} className="flex-row justify-between items-center mb-4 last:mb-0">
            <View className="flex-1 flex-row items-center justify-end">
              <View className="mr-3 items-end flex-1">
                <Text className="text-sm font-bold text-text-main text-right leading-5">{item.product_name}</Text>
                <Text className="text-xs text-text-secondary text-right mt-1">الكمية: {item.quantity}</Text>
              </View>
              <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center">
                <Package size={18} color="#94a3b8" />
              </View>
            </View>
            <Text className="text-sm font-bold text-text-main w-20 text-left">{parseFloat(item.price_at_time_of_order).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      {order.status === 'pending' && (
        <View className="px-5 pb-5 pt-0">
          <TouchableOpacity
            onPress={() => onCancel(order.id)}
            className="w-full py-3 rounded-xl border border-red-200 bg-red-50 flex-row items-center justify-center active:bg-red-100 "
          >
            <XCircle size={16} color="#DC2626" />
            <Text className="text-red-600 text-sm font-bold ml-2">إلغاء الطلب</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default function OrdersScreen() {
  const { userProfile } = useAuth();
  const { orders, isLoadingOrders, refetchOrders } = useOrders(userProfile);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (activeFilter === 'all') return orders;
    return orders.filter((order: any) => order.status === activeFilter);
  }, [orders, activeFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchOrders();
    setIsRefreshing(false);
  }, [refetchOrders]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    Alert.alert(
      "إلغاء الطلب",
      "هل أنت متأكد من أنك تريد إلغاء هذا الطلب؟",
      [
        { text: "لا", style: "cancel" },
        {
          text: "نعم",
          style: "destructive",
          onPress: async () => {
            try {
              await orderService.updateOrderStatus(orderId, "cancelled");
              refetchOrders();
            } catch (error: any) {
              Alert.alert("خطأ", `فشل في إلغاء الطلب: ${error.message}`);
            }
          }
        }
      ]
    );
  }, [refetchOrders]);

  const filters = [
    { key: 'all', label: 'الكل' },
    { key: 'pending', label: 'قيد الانتظار' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
  ];

  const renderSkeleton = () => (
    <View className="flex-1">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-3xl shadow-sm mb-5 border border-gray-100 overflow-hidden">
          <View className="p-5 border-b border-gray-100 flex-row justify-between items-center">
            <View className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <View className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
          </View>
          <View className="p-5 space-y-4">
            <View className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <View className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        <View className="p-6 bg-white shadow-sm mb-4 border-b border-border">
          <Text className="text-3xl font-bold text-text-main text-right mb-1">الطلبات</Text>
          <Text className="text-text-secondary text-sm text-right font-medium">راجع طلباتك الحالية والسابقة</Text>
        </View>

        <FlashList
          data={filteredOrders}
          renderItem={({ item }) => <OrderItem order={item} onCancel={handleCancelOrder} />}
          // @ts-ignore
          estimatedItemSize={200}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <CheckoutCard />
              <View className="mb-6">
                <Text className="text-lg font-bold text-text-main mb-3 text-right">سجل الطلبات</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1" contentContainerStyle={{ paddingRight: 4 }}>
                  {filters.map(filter => (
                    <TouchableOpacity
                      key={filter.key}
                      onPress={() => setActiveFilter(filter.key)}
                      className={`px-5 py-3 rounded-full mr-2 border  ${activeFilter === filter.key
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-200'
                        }`}
                    >
                      <Text className={`${activeFilter === filter.key ? 'text-white' : 'text-gray-700'} text-base font-medium`}>
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {isLoadingOrders && renderSkeleton()}
            </>
          }
          ListEmptyComponent={
            isLoadingOrders ? (
              <View className="px-5">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="mb-4 bg-white p-4 rounded-2xl border border-border shadow-sm">
                    <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
                      <Skeleton width={80} height={24} borderRadius={8} />
                      <Skeleton width={60} height={20} />
                    </View>
                    <View className="space-y-3 mb-4">
                      <View className="flex-row justify-end items-center gap-2">
                        <Skeleton width={100} height={16} />
                        <Skeleton width={16} height={16} borderRadius={8} />
                      </View>
                      <View className="flex-row justify-end items-center gap-2">
                        <Skeleton width={150} height={16} />
                        <Skeleton width={16} height={16} borderRadius={8} />
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center pt-2">
                      <Skeleton width={80} height={32} borderRadius={8} />
                      <Skeleton width={60} height={24} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-16">
                <View className="bg-gray-100 p-6 rounded-full mb-4">
                  <Package size={56} color="#94a3b8" />
                </View>
                <Text className="text-text-secondary mt-2 font-semibold text-lg">لا توجد لديك طلبات حتى الآن</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
          }
        />
      </AnimatedScreen>
    </View>
  );
}
