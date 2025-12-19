import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ToastItem = ({ toast }) => {
    const { removeToast } = useToast();

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] rounded-2xl min-w-[280px] max-w-[400px]"
        >
            <div className="flex-shrink-0">
                {icons[toast.type] || icons.info}
            </div>
            <p className="flex-grow text-sm font-medium text-slate-900">
                {toast.message}
            </p>
            <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-slate-400" />
            </button>
        </motion.div>
    );
};

export const ToastContainer = () => {
    const { toasts } = useToast();

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
