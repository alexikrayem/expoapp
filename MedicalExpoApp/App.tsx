import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AppLayout from './src/components/AppLayout';
import AppInitializer from './src/components/AppInitializer';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInitializer>
        <NavigationContainer>
          <AppLayout>
            <View style={styles.container}>
              <AppNavigator />
              <StatusBar style="auto" />
            </View>
          </AppLayout>
        </NavigationContainer>
      </AppInitializer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
