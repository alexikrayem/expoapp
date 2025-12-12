// Basic mock for Native Animated
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock specific expo libraries
jest.mock('expo-font', () => ({
    loadAsync: jest.fn(),
    isLoaded: jest.fn(() => true),
}));

jest.mock('expo-haptics', () => ({
    selectionAsync: jest.fn(),
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
}));

jest.mock('expo-blur', () => ({
    BlurView: ({ children }) => children,
}));

jest.mock('@shopify/flash-list', () => ({
    FlashList: ({ data, renderItem, ListHeaderComponent, ListFooterComponent, ListEmptyComponent }) => {
        const { View } = require('react-native');
        // Simple mock implementation rendering items
        return (
            <View>
                {ListHeaderComponent}
                {data.map((item, index) => renderItem({ item, index }))}
                {ListEmptyComponent}
                {ListFooterComponent}
            </View>
        );
    }
}));
