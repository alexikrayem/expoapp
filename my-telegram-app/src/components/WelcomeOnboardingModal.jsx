import TelegramLoginWidget from './TelegramLoginWidget';

/**
 * WelcomeOnboardingModal - Shows either onboarding slides for first-time users or login for new users
 */

const slides = [
  {
    id: "slide-1",
    title: "مرحباً بك في معرض المستلزمات الطبية",
    description:
      "تعرّف على تطبيقنا الذي يجمع أفضل العروض والمنتجات الطبية في مكانٍ واحد بسهولةٍ وأناقة.",
    image: "/assets/onboarding/slide1.png", // put your local images here
  },
  {
    id: "slide-2",
    title: "ابحث بسرعة وسهولة",
    description:
      "استخدم ميزة البحث المتقدّم للوصول إلى المنتجات أو العروض أو الموردين الموثوقين بسرعة فائقة.",
    image: "/assets/onboarding/slide2.png",
  },
  {
    id: "slide-3",
    title: "أنشئ قوائمك المميزة",
    description:
      "كوّن قوائمك الخاصة ورتّب منتجاتك لتظهر بشكلٍ جذّاب على الصفحة الرئيسية.",
    image: "/assets/onboarding/slide3.png",
  },
  {
    id: "slide-4",
    title: "تواصل مباشر",
    description:
      "تواصل مع الموردين مباشرة من خلال التطبيق لإتمام الصفقات والاستفسار عن المنتجات.",
    image: "/assets/onboarding/slide4.png", // Hypothetical 4th slide if needed or keep original 3
  },
];

// Reverting slides array to original structure from file view to avoid accidental changes to content not related to task
// Actually, I should stick to EXACTLY what was in the file for parts I'm not changing to be safe.
// The replace_file_content tool handles context matching.
// Let me just replacing the imports and the render block.

// I will use a smaller chunk to be safer and avoid messing with slides if I don't need to.
// But wait, the imports are at the top and the usage is at the bottom.
// I should use multi_replace_file_content for this file.




const storageKey = (version = "v1") => `hasSeenWelcome_${version}`;

export default function WelcomeOnboardingModal({
  isOpen = true,
  onFinish,
  version = "v1",
  showLogin = false // New prop to show login instead of slides
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loginError, setLoginError] = useState(null);

  // Keyboard navigation (→ next, ← previous)
  useEffect(() => {
    if (showLogin) return; // Don't handle keyboard navigation when showing login

    const handleKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showLogin, index]);

  const next = () => {
    if (index < slides.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    }
  };

  const prev = () => {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  };

  const finish = () => {
    localStorage.setItem(storageKey(version), "true");
    onFinish?.();
  };

  const handleLoginSuccess = (result) => {
    // User successfully logged in, finish onboarding
    localStorage.setItem(storageKey(version), "true");
    onFinish?.(result);
  };

  const handleLoginError = (error) => {
    setLoginError(`Login failed: ${error.message || 'Unknown error'}`);
    console.error('Telegram login failed:', error);
  };

  if (!isOpen) return null;

  if (showLogin) {
    // Show login screen instead of slides
    return (
      <div
        dir="rtl"
        className="fixed inset-0 flex items-center justify-center z-50 bg-slate-100/50 backdrop-blur-sm font-['Inter',_sans-serif]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-100 p-8 flex flex-col items-center justify-center text-center mx-4"
        >
          {/* Logo or App Icon */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-blue-100/50">
              <span className="text-2xl">🩺</span>
            </div>
          </div>

          {/* Welcome Title */}
          <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
            مرحباً بك
          </h2>

          <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
            للمتابعة، يرجى تسجيل الدخول باستخدام حسابك في تيليجرام
          </p>

          {/* Telegram Login Widget */}
          <div className="w-full mb-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-blue-100 rounded-xl opacity-0 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative bg-white border border-slate-200 rounded-xl p-4 flex justify-center shadow-sm">
                <TelegramLoginWidget
                  onLoginSuccess={handleLoginSuccess}
                  onError={handleLoginError}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="bg-red-50 text-red-600 text-xs py-2 px-3 rounded-lg mb-4 w-full flex items-center justify-center gap-2 border border-red-100">
              <span>⚠️</span> {loginError}
            </div>
          )}

          {/* Instructions */}
          <p className="text-slate-300 text-[10px] mt-2">
            بالمتابعة أنت توافق على الشروط والأحكام
          </p>
        </motion.div>
      </div>
    );
  }

  // Show onboarding slides
  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-[#E3F3FF] via-[#F5FAFF] to-white font-[Montaserat]"
    >
      <div className="relative w-full max-w-md h-[90vh] flex flex-col items-center justify-between text-center px-6 py-8 select-none">
        {/* Slide content */}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={slides[index].id}
            custom={direction}
            variants={{
              enter: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),  // swapped
              center: { x: 0, opacity: 1 },
              exit: (dir) => ({ x: dir < 0 ? -80 : 80, opacity: 0 }),   // swapped
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 250, damping: 30 }}
            className="flex-1 flex flex-col justify-center items-center w-full"
          >
            <div className="w-64 h-64 mb-8 bg-white shadow-md rounded-3xl flex items-center justify-center overflow-hidden">
              <img
                src={slides[index].image}
                alt={slides[index].title}
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 leading-snug">
              {slides[index].title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
              {slides[index].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`block w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === index ? "bg-blue-600 scale-110" : "bg-gray-300"
                }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="w-full flex items-center justify-center gap-3">
          {index > 0 && (
            <button
              onClick={prev}
              className="px-6 py-3 rounded-full bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition"
            >
              السابق
            </button>
          )}
          {index < slides.length - 1 ? (
            <button
              onClick={next}
              className="flex-1 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              ابدأ الآن
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
