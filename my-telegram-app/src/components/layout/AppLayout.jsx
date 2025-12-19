"use client"
import { Outlet, useOutletContext, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Footer from "./Footer"
import Sidebar from "./Sidebar"
import Header from "./Header"
import FloatingUI from "./FloatingUI"

const AppLayout = () => {
  const context = useOutletContext() || {}
  const location = useLocation()

  // Map routes to titles and descriptions
  const getPageMetadata = (pathname) => {
    switch (pathname) {
      case '/':
        return {
          title: "الرئيسية",
          description: "اكتشف أحدث المستلزمات الطبية والعروض الحصرية في مكان واحد"
        };
      case '/favorites':
        return {
          title: "المفضلة",
          description: "قائمة المنتجات والعروض التي قمت بحفظها للرجوع إليها لاحقاً"
        };
      case '/orders':
        return {
          title: "طلباتي",
          description: "تتبع حالة طلباتك الحالية وراجع سجل مشترياتك السابقة"
        };
      case '/cart':
        return {
          title: "سلة المشتريات",
          description: "راجع المنتجات المختارة وقم بتأكيد طلبك لإتمام عملية الشراء"
        };
      case '/settings':
        return {
          title: "الإعدادات",
          description: "تعديل الملف الشخصي، إدارة التفضيلات، وإعدادات الحساب"
        };
      default:
        return {
          title: "معرض طبيب",
          description: "منصتك الأولى للمستلزمات الطبية"
        };
    }
  };

  const { title, description } = getPageMetadata(location.pathname);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:mr-64 relative min-h-screen transition-all duration-300">
        <main className="flex-grow pb-24 md:pb-8 pt-4 px-4 md:px-12 overflow-x-hidden">
          {/* Global Header */}
          <Header title={title} description={description} />

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full mt-4"
            >
              <Outlet context={context} />
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
        <FloatingUI />
      </div>
    </div>
  )
}

export default AppLayout
