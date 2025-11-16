import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WelcomeComponent = () => {
  return (
    <View style={styles.container}>
      <Text>Welcome to Medical Expo App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
});

export default WelcomeComponent;