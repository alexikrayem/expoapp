# Medical Expo React Native Conversion Plan

This document outlines the comprehensive plan for converting the existing React web application (Telegram Mini App) to a React Native application.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Conversion Strategy](#conversion-strategy)
3. [Technical Architecture](#technical-architecture)
4. [Component Mapping](#component-mapping)
5. [Platform-Specific Considerations](#platform-specific-considerations)
6. [Development Workflow](#development-workflow)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)

## Project Overview

The current web application is a React-based Telegram Mini App for a medical supplies marketplace with features including:
- Product browsing and search
- Deals and exhibitions
- Supplier listings
- Shopping cart and checkout
- Favorites functionality
- City selection and localization
- Authentication and user profiles

## Conversion Strategy

### Phase 1: Foundation Setup (Week 1-2)
1. **Environment Setup**
   - Initialize new React Native project using Expo (recommended for easier development)
   - Configure TypeScript for type safety
   - Set up project structure mirroring web app architecture
   - Configure environment variables and API endpoints

2. **Core Dependencies Installation**
   - `react-native` with Expo
   - `@react-navigation/native` for navigation
   - `@react-native-async-storage/async-storage` for local storage
   - `react-native-svg` for SVG support
   - `react-native-vector-icons` for icon support
   - `react-native-webview` if needed for web integrations
   - `expo-constants` for app configuration
   - `expo-device` for device information
   - `expo-haptics` for haptic feedback

3. **Navigation Setup**
   - Replace `react-router-dom` with `@react-navigation/native`
   - Implement tab navigation for the three main sections (Products, Deals, Suppliers)
   - Set up modal navigation for product details, supplier details, etc.

### Phase 2: Core Architecture Migration (Week 2-4)
1. **State Management**
   - Migrate React Context providers to React Native (all context files will work the same way)
   - Adapt local storage usage with `@react-native-async-storage/async-storage`
   - Update all localStorage calls in context providers to use AsyncStorage
   - Ensure all context providers work in React Native environment

2. **API Integration**
   - Port existing API service calls to work with React Native
   - Update apiClient.js to use AsyncStorage instead of localStorage for token management
   - Handle any platform-specific networking differences
   - Ensure authentication flow works properly without Telegram WebApp

3. **UI Components Migration**
   - Replace web-specific components with React Native equivalents
   - Adapt styling from CSS/Tailwind to React Native StyleSheet/Flexbox
   - Implement responsive design for mobile screens
   - Convert all HTML elements to React Native components

### Phase 3: Feature Implementation (Week 4-6)
1. **Main Features**
   - Home screen with tab navigation
   - Product browsing and filtering
   - Deals and exhibitions section
   - Supplier listings
   - Search functionality

2. **User Features**
   - Authentication flow
   - Profile management
   - Favorites functionality
   - Shopping cart
   - Checkout process

### Phase 4: Polish and Optimization (Week 6-7)
1. **Performance Optimization**
   - Implement virtualized lists for large datasets
   - Optimize images and assets for mobile
   - Implement caching strategies

2. **UX Improvements**
   - Add platform-appropriate animations
   - Implement native haptic feedback
   - Ensure consistent design language

## Technical Architecture

### Navigation Structure
```
TabNavigator
├── Exhibitions Tab (Deals)
├── Products Tab (Products)
└── Suppliers Tab (Suppliers)
    └── Modal Stack (Product/Supplier/Deal Detail)
```

### State Management
- **Context Migration**: All existing React Context providers will be adapted for React Native:
  - CartContext
  - SearchContext
  - FilterContext
  - CheckoutContext
  - ModalContext
  - CurrencyContext
  - CacheContext
  - MiniCartContext

- **Persistence**: Replace browser localStorage with `@react-native-async-storage/async-storage`

### Component Mapping Strategy

| Web Component | React Native Equivalent | Notes |
|---------------|------------------------|-------|
| `<div>` | `<View>` | Layout containers |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` | Interactive elements |
| `<input>` | `<TextInput>` | Text input fields |
| `<img>` | `<Image>` | Image display |
| `<a>` | `<Pressable>` with navigation | Links |
| `<select>` | `<Picker>` component | Dropdown selection |
| `<form>` | `KeyboardAvoidingView` with `TextInput` | Form handling |
| Tailwind CSS | React Native StyleSheet | Styling system |
| `framer-motion` | `react-native-reanimated` | Animations |
| `react-router-dom` | `@react-navigation/native` | Routing system |
| Swiper/Carousel | `react-native-snap-carousel` or `FlatList` | Image/carousel components |
| Modal/Panels | React Native Modal or custom | Overlay components |
| SVG Icons | `react-native-svg` | Vector graphics |
| HTML5 Video/Audio | `expo-av` | Media components |

#### Specific Component Mappings from Current App

| Current Web Component | React Native Implementation | Notes |
|----------------------|----------------------------|-------|
| `AppInitializer.jsx` | App startup flow with context providers | Maintain same state management pattern |
| `AppLayout.jsx` | Main screen layout with tabs and footers | Replace with React Navigation tab structure |
| `HomePage.jsx` | Tabbed home screen with featured slider | Implement with Bottom Tab Navigator |
| `Header.jsx` | Screen header with search | Adapt for native header styling |
| `Footer.jsx` | Bottom navigation | Replace with native tab bar |
| `FeaturedSlider.jsx` | Image carousel using react-native-snap-carousel or FlatList | Adapt styling and add native animation for slide transitions |
| `FeaturedSliderSkeleton.jsx` | Native loading skeleton using react-native-skkeleton or similar | Implement with View components and loading animations |
| Product components | Product cards with touch handlers | Replace with `TouchableOpacity` and native styling |
| Modal components | Native modal implementations | Use React Native Modal, BottomSheet, or react-native-modal for different use cases |
| `CitySelectionModal.jsx` | City selection screen | Implement as native modal with Picker or FlatList for selection |
| `ProductDetailModal.jsx` | Product details sheet | Implement as bottom sheet modal with native animations |
| `SupplierDetailModal.jsx` | Supplier details sheet | Implement as bottom sheet modal |
| `DealDetailModal.jsx` | Deal details sheet | Implement as bottom sheet modal |
| `CartSidebar.jsx` | Shopping cart drawer | Implement as slide-up modal or bottom sheet |
| `OrderConfirmationModal.jsx` | Order confirmation sheet | Implement as native modal |
| Login components | Native authentication screens | Replace Telegram widget with direct API calls |
| `WelcomeOnboardingModal.jsx` | Onboarding slides | Implement with FlatList or react-native-snap-carousel |
| Search components | Native search with TextInput | Use TextInput with search icon and clear button |
| Filter components | Native filter UI | Implement with Picker, Switch, and TextInput components |

## Platform-Specific Considerations

### Screen Size and Orientation
- Design for mobile-first experience
- Implement responsive layouts for different screen sizes
- Consider both portrait and landscape orientations

### Performance Considerations
- Optimize for mobile hardware constraints
- Implement efficient list rendering with FlatList/SectionList
- Minimize bundle size and optimize assets

### Native Features
- Implement native haptic feedback (replacing Telegram WebApp haptics)
- Use native navigation patterns
- Integrate with platform-specific features if needed

### Platform Differences
- Web: Uses Telegram WebApp features
- Native: Will need to implement equivalent functionality or alternatives
- Handle keyboard appearance for search and input fields differently
- Different touch interaction patterns

### Web-Specific Features Requiring Adaptation

#### 1. Telegram WebApp Integration
- **Current Implementation**: Uses `window.Telegram.WebApp` for:
  - Haptic feedback (e.g., `window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")`)
  - Notification feedback
  - App-specific UI controls
  - Data from Telegram login

- **Native Adaptation**: 
  - Replace with `expo-haptics` for haptic feedback
  - Implement alternative authentication flow (no Telegram widget)
  - Remove WebApp-specific UI controls
  - Use AsyncStorage for data persistence instead of Telegram environment

#### 2. HTML-based UI Components
- **Current Implementation**: Uses HTML elements (div, button, input, img, select, etc.) with Tailwind CSS
- **Native Adaptation**: Replace with React Native components (View, TouchableOpacity, TextInput, Image, Picker, etc.)

#### 3. Browser Storage
- **Current Implementation**: Uses `localStorage` for storing:
  - Authentication tokens (accessToken, refreshToken)
  - Cart data
  - User preferences
  - Welcome screen view status
  
- **Native Adaptation**: Use `@react-native-async-storage/async-storage`

#### 4. Telegram Login Widget
- **Current Implementation**: Uses external script (`https://telegram.org/js/telegram-widget.js?22`) for authentication
- **Native Adaptation**: Implement a custom authentication flow using the app's API (the app already has `/auth/telegram-login-widget` endpoint that can be called directly)

#### 5. Web Animations Library
- **Current Implementation**: Uses `framer-motion` for animations
- **Native Adaptation**: Use `react-native-reanimated` with `react-native-gesture-handler` for better native performance

#### 6. Routing System
- **Current Implementation**: Uses `react-router-dom` for navigation
- **Native Adaptation**: Use `@react-navigation/native` for React Native navigation

#### 7. External Dependencies
- **Current Implementation**: Uses web-specific libraries like `swiper` for carousels
- **Native Adaptation**: Use React Native equivalents or libraries like `react-native-snap-carousel`

#### 8. Image Handling
- **Current Implementation**: Direct image imports and HTML img tags
- **Native Adaptation**: Use React Native Image component with proper sizing and caching

#### 9. Form Handling
- **Current Implementation**: Uses standard HTML form elements and input controls
- **Native Adaptation**: Use React Native TextInput, Picker, Switch, etc. with appropriate styling

## Development Workflow

### Authentication Flow Adaptation
The current app uses Telegram Login Widget for authentication. For the React Native version:

1. **Remove Telegram Widget Integration**: The current app loads `https://telegram.org/js/telegram-widget.js?22` and uses `window.onTelegramAuth`

2. **Direct API Authentication**: The app already has a working endpoint at `/auth/telegram-login-widget` that can be called directly with the proper auth data

3. **Fallback Authentication**: The app has dev bypass functionality that can be adapted for testing

4. **Token Management**: The token refresh and management logic will remain the same, just using AsyncStorage instead of localStorage

### Environment Setup Commands
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Create new Expo project
npx create-expo-app MedicalExpoApp --template

# Install dependencies
cd MedicalExpoApp
npm install @react-navigation/native react-native-screens react-native-safe-area-context
npx expo install react-native-reanimated react-native-gesture-handler react-native-vector-icons
npm install @react-navigation/native-stack @react-navigation/bottom-tabs
npm install @react-native-async-storage/async-storage
npm install react-native-svg react-native-webview expo-haptics
npm install framer-motion react-native-reanimated
```

### Folder Structure
```
MedicalExpoApp/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # App screens (replacing web pages)
│   ├── navigation/          # Navigation setup
│   ├── hooks/               # Custom hooks
│   ├── context/             # State management providers
│   ├── services/            # API and business logic
│   ├── utils/               # Utility functions
│   └── assets/              # Images and other assets
├── app.json                 # App configuration
├── App.js                   # Main app component
└── package.json
```

## Modal and UI Component Handling

### Modal Implementation Strategy
The current web app heavily uses modals for various purposes:

1. **Product Detail Modals**: Currently implemented as slide-up overlays with rich content
   - **Native Adaptation**: Use `react-native-bottom-sheet` or custom implementation with `react-native-modal`
   - Include native animations and gestures for opening/closing
   - Implement proper keyboard handling when forms are present

2. **Supplier Detail Modals**: Similar to product details but with supplier-specific information
   - **Native Adaptation**: Same bottom-sheet approach with appropriate styling

3. **Deal Detail Modals**: Show promotional content and related products
   - **Native Adaptation**: Bottom-sheet with swipe-to-dismiss functionality

4. **Cart Sidebar**: Currently a slide-in drawer from the right
   - **Native Adaptation**: Implement as slide-up bottom sheet or modal with slide-in animation

5. **Selection Modals**: City selection, filter options
   - **Native Adaptation**: Use native Picker component or FlatList for better mobile experience

### Featured Slider Implementation Strategy
The featured items slider is a critical component for showcasing promotions:

1. **Current Implementation**: Uses web-based slider library with autoplay and swipe gestures
   - **Native Adaptation**: Use `react-native-snap-carousel` or implement with `FlatList` with snap-to-align functionality

2. **Loading States**: Currently uses `FeaturedSliderSkeleton.jsx` for loading states
   - **Native Adaptation**: Implement native skeleton loading with `react-native-skeleton` or custom View components

3. **Touch Interactions**: Web slider allows mouse/touch swipe
   - **Native Adaptation**: Leverage native touch handling for smoother performance

4. **Auto-play Functionality**: May need to be adapted for mobile battery considerations
   - **Native Adaptation**: Implement with performance considerations and user control

5. **Image Handling**: Current implementation uses web images
   - **Native Adaptation**: Use React Native `Image` component with proper caching and error handling

## Testing Strategy

### Unit Testing
- Maintain existing test coverage using Jest
- Adapt tests for React Native components
- Test business logic independently of UI

### Integration Testing
- Test navigation flows
- Test API integration
- Test state management flows

### End-to-End Testing
- Use Detox for native E2E testing
- Test critical user journeys
- Test on both iOS and Android

## Deployment Strategy

### App Store Distribution
- Build standalone app for iOS and Android
- Follow platform-specific guidelines
- Implement proper app signing and distribution

### OTA Updates
- Use Expo Updates for over-the-air updates
- Configure update frequency and rollback capabilities

## Migration Checklist

### Before Migration
- [ ] Document all current features and functionality
- [ ] Identify all external dependencies
- [ ] Plan for Telegram WebApp feature replacements
- [ ] Set up development environment
- [ ] Create API compatibility tests to ensure backend works with native app

### During Migration
- [ ] Maintain API compatibility
- [ ] Replace Telegram authentication with direct API calls
- [ ] Implement native storage (AsyncStorage) instead of localStorage
- [ ] Replace all haptic feedback calls with expo-haptics
- [ ] Replace all web-specific navigation with React Navigation
- [ ] Adapt all styling from Tailwind to React Native StyleSheet
- [ ] Replace all HTML elements with React Native equivalents
- [ ] Preserve user experience patterns where possible
- [ ] Test functionality incrementally
- [ ] Update documentation

### Post Migration
- [ ] Perform comprehensive testing on both platforms
- [ ] Optimize performance
- [ ] Gather user feedback
- [ ] Iterate based on findings
- [ ] Ensure all authentication flows work properly
- [ ] Verify all API endpoints respond correctly to native requests

## Risk Mitigation

### Potential Challenges
1. **Platform Differences**: Some web features may not have direct native equivalents
2. **Performance**: Mobile hardware may limit complex operations
3. **User Experience**: Different interaction patterns between web and native

### Mitigation Strategies
1. **Incremental Migration**: Migrate components in phases to reduce risk
2. **Performance Budget**: Set performance targets and monitor continuously
3. **User Testing**: Conduct user testing throughout the migration process
4. **Fallback Options**: Implement fallbacks for platform limitations

## Success Metrics

- App store approval and availability
- Performance benchmarks (load time, responsiveness)
- User adoption and retention
- Feature parity with web version
- App store ratings and reviews

## Timeline

- **Week 1-2**: Environment setup and architecture planning
- **Week 3-4**: Core architecture and navigation implementation
- **Week 5-6**: Feature migration and component adaptation
- **Week 7-8**: Testing, optimization, and deployment preparation
- **Week 9**: App store submission and launch