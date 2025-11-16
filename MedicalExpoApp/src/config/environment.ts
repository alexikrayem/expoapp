// Environment configuration for Medical Expo React Native App
const Environment = {
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
  API_VERSION: 'v1',
  
  // App Configuration
  APP_NAME: 'MedicalExpo',
  APP_VERSION: '1.0.0',
  
  // Feature flags
  ENABLE_DEV_BYPASS: process.env.EXPO_PUBLIC_ENABLE_DEV_BYPASS === 'true',
  DEV_BYPASS_TOKEN: process.env.EXPO_PUBLIC_DEV_BYPASS_TOKEN || 'default_dev_token',
  
  // Timeout configurations
  API_TIMEOUT: 30000, // 30 seconds
  
  // Other configurations
  DEFAULT_CITY_ID: '1',
  DEFAULT_COUNTRY_CODE: 'KZ', // Kazakhstan
};

export default Environment;