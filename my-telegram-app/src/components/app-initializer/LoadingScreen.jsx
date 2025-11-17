import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import appLogoImage from '../../assets/IMG_1787.png';

// Quotes array - make sure it's consistent with the original
const dentistQuotes = [
  { quote: "كل سن في رأس الرجل أثمن من الماس.", author: "ميغيل دي ثيربانتس" },
  { quote: "صحة الفم هي نافذة على صحتك العامة.", author: "سي. إيفرت كوب" },
  { quote: "الابتسامة هي انحناءة تجعل كل شيء مستقيمًا.", author: "فيليس ديلر" },
  { quote: "الفم هو بوابة الجسم.", author: "مجهول" },
  { quote: "أسنان صحية، جسم سليم.", author: "مثل شعبي" },
  { quote: "الوقاية خير من العلاج، خاصة في طب الأسنان.", author: "مقولة شائعة" },
];

const LoadingScreen = ({ step, quoteIndex }) => {
  const currentQuote = dentistQuotes[quoteIndex % dentistQuotes.length]; // Safe access with modulo

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center text-gray-800 px-6 font-sans relative"
      style={{
        background: "linear-gradient(to top, #e6f4ff 0%, #ffffff 70%)", // icy blue -> white
      }}
    >
      <motion.img
        src={appLogoImage}
        alt="App Logo"
        className="w-40 h-40 object-contain mb-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.h1
        className="text-3xl font-extrabold mb-4 text-gray-900"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        معرض المستلزمات الطبية
      </motion.h1>
      <motion.div
        className="flex items-center gap-3 text-gray-700 mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        <span className="text-base font-medium">{step}</span>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuote.quote}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="absolute bottom-20 w-full max-w-md mx-auto px-6"
          dir="rtl"
        >
          <div className="text-center">
            <p className="text-gray-600 text-lg italic leading-relaxed">{currentQuote.quote}</p>
            <div className="text-sm font-semibold text-blue-600 mt-2">- {currentQuote.author}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LoadingScreen;