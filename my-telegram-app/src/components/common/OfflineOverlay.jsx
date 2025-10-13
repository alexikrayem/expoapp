import { WifiOff } from "lucide-react"

const OfflineOverlay = ({ isOnline }) => {
  if (isOnline) return null

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-auto">
      <div className="bg-white rounded-lg p-6 m-4 max-w-sm shadow-2xl" dir="rtl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-red-100 rounded-full">
            <WifiOff className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد اتصال بالإنترنت</h3>
            <p className="text-gray-600">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfflineOverlay
