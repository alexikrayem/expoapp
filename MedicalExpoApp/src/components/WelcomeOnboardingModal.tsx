import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onFinish: () => void;
  showLogin: boolean;
}

const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({ 
  isOpen, 
  onFinish, 
  showLogin 
}) => {
  if (!isOpen) {
    return null;
  }

  if (showLogin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Please log in to continue</Text>
        <TouchableOpacity style={styles.loginButton} onPress={onFinish}>
          <Text style={styles.buttonText}>Login with Telegram</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show welcome slides
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MedicalExpo</Text>
      <Text style={styles.subtitle}>Your medical supplies marketplace</Text>
      <TouchableOpacity style={styles.finishButton} onPress={onFinish}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeOnboardingModal;