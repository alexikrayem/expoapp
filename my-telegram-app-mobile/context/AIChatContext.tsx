import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Keyboard } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';

interface AIChatContextType {
    isAIMode: boolean;
    toggleAIMode: () => void;
    animation: any; // SharedValue<number>
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
    const [isAIMode, setIsAIMode] = useState(false);
    const animation = useSharedValue(0);

    const toggleAIMode = () => {
        const newValue = !isAIMode;
        setIsAIMode(newValue);
        animation.value = withSpring(newValue ? 1 : 0, {
            damping: 15,
            stiffness: 100,
        });

        if (!newValue) {
            Keyboard.dismiss();
        }
    };

    return (
        <AIChatContext.Provider value={{ isAIMode, toggleAIMode, animation }}>
            {children}
        </AIChatContext.Provider>
    );
}

export function useAIChat() {
    const context = useContext(AIChatContext);
    if (context === undefined) {
        throw new Error('useAIChat must be used within an AIChatProvider');
    }
    return context;
}
