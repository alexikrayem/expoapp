import React from 'react';
import { View, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Home, Heart, ShoppingBag, Settings } from 'lucide-react-native';
import Text from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/utils/haptics';

const { width } = Dimensions.get('window');

const TAB_ICONS: { [key: string]: any } = {
    index: Home,
    favorites: Heart,
    orders: ShoppingBag,
    settings: Settings,
};

const TAB_LABELS: { [key: string]: string } = {
    index: 'الرئيسية',
    favorites: 'المفضلة',
    orders: 'طلباتي',
    settings: 'الإعدادات',
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <View style={styles.tabBar}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    // Skip hidden routes
                    if ((options as any).href === null) return null;

                    const Icon = TAB_ICONS[route.name] || Home;
                    const label = TAB_LABELS[route.name] || route.name;

                    const onPress = () => {
                        haptics.selection();
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconContainer,
                                isFocused && styles.iconContainerActive
                            ]}>
                                <Icon
                                    size={22}
                                    color={isFocused ? '#2563eb' : '#64748b'}
                                    strokeWidth={isFocused ? 2.5 : 2}
                                />
                            </View>
                            <Text style={[
                                styles.label,
                                isFocused && styles.labelActive
                            ]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 60,
        paddingHorizontal: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    iconContainer: {
        width: 44,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        marginBottom: 4,
    },
    iconContainerActive: {
        backgroundColor: '#eff6ff',
    },
    label: {
        fontSize: 11,
        fontFamily: 'TajawalCustom',
        color: '#64748b',
    },
    labelActive: {
        color: '#2563eb',
        fontWeight: '600',
    },
});
