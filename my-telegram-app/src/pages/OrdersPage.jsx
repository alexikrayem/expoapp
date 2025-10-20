"use client"

import { useState, useMemo } from "react"
import { useOutletContext } from "react-router-dom"
import { useCart } from "../context/CartContext"
import { useCheckout } from "../context/CheckoutContext"
import { useOrders } from "../hooks/useOrders"
import OrdersTab from "../components/tabs/OrdersTab"
import { Loader2, Trash2, Plus, Minus } from "lucide-react"
import { useCurrency } from "../context/CurrencyContext"
import { motion } from "framer-motion"
import { orderService } from "../services/orderService"
import appLogoImage from "/src/assets/IMG_1787.png"; // Adjust path if necessary
import SlideToConfirm from "../components/common/SlideToConfirm"

// --- FILTER BAR COMPONENT (with consistent design) ---
const OrderFilterBar = ({ activeFilter, setActiveFilter }) => {
  const filters = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "قيد الانتظار" },
    { key: "completed", label: "مكتملة" },
    { key: "cancelled", label: "ملغاة" },
  ]
  return (
    <div className="relative">
      <div className="flex items-center gap-3 overflow-x-auto p-2 scrollbar-hide">
        {filters.map((filter) => {
          const isSelected = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`relative flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSelected ? "text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"}`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeOrderStatusPill"
                  className="absolute inset-0 bg-blue-600 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{filter.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- CHECKOUT CARD COMPONENT (fully implemented) ---
const CheckoutCard = () => {
  const { cartItems, getCartTotal, actions } = useCart()
  const { startCheckout, isPlacingOrder } = useCheckout()
  const { formatPrice } = useCurrency()
  const { telegramUser, userProfile, onProfileUpdate } = useOutletContext() || {}
  const total = getCartTotal()

  if (!cartItems || cartItems.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-blue-200">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-800">سلة التسوق الحالية</h2>
        <p className="text-sm text-gray-600">جاهزة للإرسال</p>
      </div>
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
        {cartItems.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-b-0">
            <div
              className="h-14 w-14 rounded-lg flex-shrink-0 bg-cover bg-center bg-gray-200"
              style={{ backgroundImage: `url(${item.image_url})` }}
            ></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-sm">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.supplier_name}</p>
              <div className="text-blue-600 font-semibold">{formatPrice(item.effective_selling_price)}</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => actions.decreaseQuantity(item.product_id)}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300"
              >
                {item.quantity > 1 ? <Minus className="h-4 w-4" /> : <Trash2 className="h-4 w-4 text-red-500" />}
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => actions.increaseQuantity(item.product_id)}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between items-center mb-4 text-lg">
          <span className="font-semibold">المجموع:</span>
          <span className="font-bold text-blue-600">{formatPrice(total)}</span>
        </div>
  <SlideToConfirm
  onConfirm={async () => await startCheckout(userProfile, telegramUser, onProfileUpdate)}
  disabled={isPlacingOrder}
  loading={isPlacingOrder}
  text="إرسال الطلب"
/>


        
      </div>
    </div>
  )
}

const OrdersPage = () => {
  const { telegramUser } = useOutletContext() || {}
  const { orders, isLoadingOrders, ordersError, refetchOrders } = useOrders(telegramUser)
  const [activeFilter, setActiveFilter] = useState("all")
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(null)

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    if (activeFilter === "all") return orders
    return orders.filter((order) => order.status === activeFilter)
  }, [orders, activeFilter])

  const handleCancelOrder = async (orderId) => {
    if (isUpdatingOrder || !window.confirm("هل أنت متأكد من أنك تريد إلغاء هذا الطلب؟")) return
    setIsUpdatingOrder(orderId)
    try {
      await orderService.updateOrderStatus(orderId, "cancelled")
      refetchOrders()
    } catch (error) {
      console.error("Failed to cancel order:", error)
      alert(`فشل في إلغاء الطلب: ${error.message}`)
    } finally {
      setIsUpdatingOrder(null)
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      {/* --- PREHEADER COMPONENT: Centered Logo + Brand Text --- */}
<motion.div
  className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2"
>
  <img
    src={appLogoImage}
    alt="App Logo"
    className="object-contain rounded-xl w-10 h-10 sm:w-12 sm:h-12"
  />
  <div className="flex flex-col items-center text-center">
    <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">
      معرض طبيب
    </span>
    <span className="text-sm text-gray-500 leading-tight truncate">
      المستلزمات الطبية
    </span>
  </div>
</motion.div>

      <header className="mb-6 mt-4">
        <h1 className="text-3xl font-bold text-gray-800">الطلبات</h1>
        <p className="text-gray-500 mt-1">راجع طلباتك الحالية والسابقة.</p>
      </header>

      <CheckoutCard />

      <div className="my-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">سجل الطلبات</h2>
        <OrderFilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      </div>

      <OrdersTab
        orders={filteredOrders}
        isLoading={isLoadingOrders}
        error={ordersError}
        onCancelOrder={handleCancelOrder}
        updatingOrderId={isUpdatingOrder}
      />
    </div>
  )
}

export default OrdersPage
