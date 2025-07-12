# Code Organization and Quality Improvements Plan

## Current Architecture Analysis

Your project consists of:
- **Backend API** (Node.js/Express/PostgreSQL)
- **Customer TMA** (React/Vite - Telegram Mini App)
- **Delivery Agent TMA** (React/Vite)
- **Supplier Admin Panel** (React/Vite)
- **Platform Admin Panel** (React/Vite)

## Critical Issues Identified

### 1. **Code Duplication & Shared Logic**
- Authentication logic repeated across all frontends
- API client setup duplicated
- Common components (modals, forms) not shared
- Similar state management patterns repeated

### 2. **File Organization Issues**
- Large files (MainPanel.jsx ~800+ lines)
- Mixed concerns in single files
- No clear separation of business logic
- Missing proper folder structure

### 3. **Security & Configuration**
- Hardcoded API URLs
- Inconsistent environment variable usage
- Missing input validation
- No proper error boundaries

### 4. **Performance Issues**
- No code splitting
- Large bundle sizes
- Inefficient re-renders
- Missing memoization

## Recommended Improvements

### Phase 1: Shared Libraries & Monorepo Structure

```
project-root/
├── packages/
│   ├── shared-ui/           # Shared React components
│   ├── shared-utils/        # Common utilities
│   ├── api-client/          # Shared API client
│   └── types/               # TypeScript definitions
├── apps/
│   ├── customer-tma/
│   ├── delivery-agent-tma/
│   ├── supplier-admin/
│   ├── platform-admin/
│   └── backend/
├── tools/
│   ├── build-scripts/
│   └── deployment/
└── docs/
```

### Phase 2: Backend Improvements

#### File Structure
```
backend/
├── src/
│   ├── controllers/         # Route handlers
│   ├── services/           # Business logic
│   ├── models/             # Data models
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utilities
│   ├── validators/         # Input validation
│   ├── types/              # TypeScript types
│   └── config/             # Configuration
├── tests/
├── migrations/
└── docs/
```

### Phase 3: Frontend Improvements

#### Shared Components Library
```typescript
// packages/shared-ui/src/components/
export { Button } from './Button'
export { Modal } from './Modal'
export { Form } from './Form'
export { DataTable } from './DataTable'
export { LoadingSpinner } from './LoadingSpinner'
```

#### Custom Hooks Library
```typescript
// packages/shared-utils/src/hooks/
export { useApi } from './useApi'
export { useAuth } from './useAuth'
export { useLocalStorage } from './useLocalStorage'
export { usePagination } from './usePagination'
```

#### API Client Package
```typescript
// packages/api-client/src/
export { createApiClient } from './client'
export { authService } from './services/auth'
export { productService } from './services/products'
export { orderService } from './services/orders'
```

## Implementation Steps

### Step 1: Extract Shared Components
1. Create shared UI package
2. Extract common components (Modal, Button, Form, etc.)
3. Standardize props and styling
4. Add Storybook for documentation

### Step 2: Centralize API Logic
1. Create unified API client
2. Implement proper error handling
3. Add request/response interceptors
4. Standardize authentication

### Step 3: Improve State Management
1. Implement proper context providers
2. Add state persistence
3. Optimize re-renders with useMemo/useCallback
4. Consider adding Zustand or Redux Toolkit

### Step 4: Add Type Safety
1. Convert to TypeScript
2. Define shared types
3. Add runtime validation with Zod
4. Implement proper error types

### Step 5: Performance Optimization
1. Implement code splitting
2. Add lazy loading
3. Optimize bundle sizes
4. Add performance monitoring

### Step 6: Testing & Quality
1. Add unit tests (Jest/Vitest)
2. Add integration tests
3. Implement E2E tests (Playwright)
4. Add code quality tools (ESLint, Prettier)

## Immediate Quick Wins

### 1. Environment Configuration
```typescript
// shared-utils/src/config.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000,
  },
  auth: {
    tokenKey: 'authToken',
    refreshTokenKey: 'refreshToken',
  },
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  },
}
```

### 2. Unified Error Handling
```typescript
// shared-utils/src/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    return new ApiError(
      error.response?.data?.message || error.message,
      error.response?.status || 500,
      error.response?.data?.code
    )
  }
  return new ApiError('An unexpected error occurred', 500)
}
```

### 3. Standardized API Client
```typescript
// api-client/src/client.ts
import axios, { AxiosInstance } from 'axios'
import { config } from '@shared/utils'

export const createApiClient = (baseURL?: string): AxiosInstance => {
  const client = axios.create({
    baseURL: baseURL || config.api.baseUrl,
    timeout: config.api.timeout,
  })

  // Request interceptor
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Handle token expiration
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
      return Promise.reject(handleApiError(error))
    }
  )

  return client
}
```

### 4. Component Optimization Example
```typescript
// Before: Large MainPanel component
// After: Split into smaller components

// components/ProductGrid.tsx
export const ProductGrid = memo(({ products, onProductClick }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onClick={onProductClick}
        />
      ))}
    </div>
  )
})

// hooks/useProducts.ts
export const useProducts = (cityId: string) => {
  return useQuery({
    queryKey: ['products', cityId],
    queryFn: () => productService.getProducts({ cityId }),
    enabled: !!cityId,
  })
}

// MainPanel.tsx (simplified)
export const MainPanel = () => {
  const { data: products, isLoading } = useProducts(selectedCityId)
  
  return (
    <div>
      <Header />
      <SearchBar />
      {isLoading ? <LoadingSkeleton /> : <ProductGrid products={products} />}
    </div>
  )
}
```

## Tools & Dependencies to Add

### Development Tools
```json
{
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^14.0.0",
    "vitest": "^0.34.0",
    "@testing-library/react": "^13.0.0",
    "msw": "^1.0.0"
  }
}
```

### Production Dependencies
```json
{
  "dependencies": {
    "@tanstack/react-query": "^4.0.0",
    "zod": "^3.0.0",
    "zustand": "^4.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0"
  }
}
```

## Migration Strategy

### Week 1-2: Setup & Planning
- Set up monorepo structure
- Create shared packages
- Establish coding standards

### Week 3-4: Extract Shared Logic
- Move common components to shared-ui
- Create unified API client
- Standardize authentication

### Week 5-6: Optimize Performance
- Implement code splitting
- Add proper state management
- Optimize bundle sizes

### Week 7-8: Testing & Documentation
- Add comprehensive tests
- Create documentation
- Set up CI/CD pipelines

## Expected Benefits

1. **Reduced Code Duplication**: 40-60% reduction in duplicate code
2. **Improved Maintainability**: Centralized logic easier to update
3. **Better Performance**: Optimized bundles and rendering
4. **Enhanced Developer Experience**: Better tooling and type safety
5. **Easier Testing**: Isolated components and logic
6. **Faster Feature Development**: Reusable components and patterns

This refactoring plan will transform your codebase into a more maintainable, scalable, and performant application suite.