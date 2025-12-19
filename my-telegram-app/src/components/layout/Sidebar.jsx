import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Heart, ShoppingBag, User, Settings, ShoppingCart, Search, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { useSearch } from '../../context/SearchContext';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/userService';
import { cityService } from '../../services/cityService';
import { useToast } from '../../context/ToastContext';
import appLogoImage from "/src/assets/IMG_1787.png";
import ProfileIcon from "../common/ProfileIcon";
import CityChangePopover from "../common/CityChangePopover";


const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cart } = useCart();
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext() || {};
    const { openModal } = useModal();
    const { setIsSearchPopoverOpen } = useSearch();

    const cartItemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

    const navItems = [
        { id: 'home', icon: Home, label: 'الرئيسية', path: '/' },
        { id: 'search', icon: Search, label: 'البحث', onClick: () => setIsSearchPopoverOpen(true) },
        { id: 'favorites', icon: Heart, label: 'المفضلة', path: '/favorites' },
        { id: 'orders', icon: ShoppingBag, label: 'طلباتي', path: '/orders' },
        { id: 'cart', icon: ShoppingCart, label: 'السلة', path: '/cart', badge: cartItemCount },
    ];

    const bottomItems = [
        { id: 'settings', icon: Settings, label: 'الإعدادات', path: '/settings' },
    ];

    const handleProfileClick = () => {
        openModal("profile", { telegramUser, userProfile });
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light");
    };

    // City Selection State
    const [isCityPopoverOpen, setIsCityPopoverOpen] = React.useState(false);
    const [isChangingCity, setIsChangingCity] = React.useState(false);
    const [preloadedCities, setPreloadedCities] = React.useState(null);
    const { showToast } = useToast();

    React.useEffect(() => {
        cityService.getCities().then(setPreloadedCities).catch(console.error);
    }, []);

    const handleCityChange = async (city) => {
        if (!city || isChangingCity) return;
        setIsChangingCity(true);
        setIsCityPopoverOpen(false);
        try {
            await userService.updateProfile({ selected_city_id: city.id });
            onProfileUpdate();
            showToast(`تم تغيير المدينة إلى ${city.name}`, 'success');
        } catch {
            showToast('فشل تغيير المدينة', 'error');
        } finally {
            setIsChangingCity(false);
        }
    };

    return (
        <aside className="hidden md:flex flex-col w-64 glass-sidebar fixed h-full z-20 border-l border-slate-200/50 shadow-xl">
            {/* Logo Section */}
            <div className="p-8 pb-4 flex flex-col items-center">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative group cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                    <img
                        src={appLogoImage}
                        alt="Logo"
                        className="relative w-20 h-20 object-contain rounded-2xl bg-white p-2 shadow-sm border border-slate-100"
                    />
                </motion.div>
                <div className="mt-4 text-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">معرض طبيب</h1>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Medical Expo</p>
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 flex flex-col gap-1.5 px-4 py-6 overflow-y-auto">
                {navItems.map(({ id, icon: Icon, label, path, badge, onClick }) => {
                    const isActive = path ? location.pathname === path : false;

                    const content = (
                        <>
                            <div className="relative">
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </div>
                            <span className="font-medium text-[15px]">{label}</span>
                        </>
                    );

                    if (onClick) {
                        return (
                            <button
                                key={id}
                                onClick={onClick}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <NavLink
                            key={id}
                            to={path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                                ${isActive
                                    ? 'bg-blue-600 text-white shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] font-semibold'
                                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}
                            `}
                        >
                            {content}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Section: Profile, Settings & City */}
            <div className="p-4 mt-auto border-t border-slate-100">
                <div className="flex flex-col gap-1.5">
                    {/* City Selector */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsCityPopoverOpen((prev) => !prev)}
                            disabled={isChangingCity}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-70"
                        >
                            {isChangingCity ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> : <MapPin className="h-4 w-4 text-blue-600" />}
                            <div className="flex flex-col items-start overflow-hidden">
                                <span className="text-[10px] text-slate-400 leading-none">المدينة الحالية</span>
                                <span className="text-sm font-semibold text-slate-900 truncate">
                                    {isChangingCity ? "جاري..." : userProfile?.selected_city_name || "اختر المدينة"}
                                </span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-slate-300 mr-auto" />
                        </motion.button>

                        <AnimatePresence>
                            {isCityPopoverOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-full">
                                    <CityChangePopover
                                        onCitySelect={handleCityChange}
                                        currentCityId={userProfile?.selected_city_id}
                                        onClose={() => setIsCityPopoverOpen(false)}
                                        preloadedCities={preloadedCities}
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Settings */}
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                            ${isActive
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                        `}
                    >
                        <Settings size={20} strokeWidth={2} />
                        <span className="font-medium">الإعدادات</span>
                    </NavLink>

                    {/* Profile */}
                    <button
                        onClick={handleProfileClick}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-700 bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50 shadow-sm"
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm">
                            <ProfileIcon user={telegramUser} asDiv className="w-full h-full shadow-none" />
                        </div>
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="text-sm font-bold text-slate-900 truncate w-full">حسابي</span>
                            <span className="text-[10px] text-slate-400 truncate w-full">{userProfile?.full_name || 'الملف الشخصي'}</span>
                        </div>
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-[10px] text-slate-300 font-medium tracking-tight">Version 1.2.0 • Made with ❤️</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;


