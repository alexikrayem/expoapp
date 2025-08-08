# Testing Guide for Medical Expo Platform

## Overview
This comprehensive testing suite ensures 70%+ confidence for deployment by testing critical user flows, API endpoints, and system integrations.

## Test Structure

### Frontend Tests (`my-telegram-app/src/test/`)
- **Component Tests**: Individual component functionality
- **Hook Tests**: Custom hooks and state management
- **Integration Tests**: Component interactions and data flow
- **E2E Tests**: Complete user journeys

### Backend Tests (`telegram-app-backend/test/`)
- **Route Tests**: API endpoint functionality
- **Middleware Tests**: Authentication and validation
- **Service Tests**: Business logic and external integrations
- **Database Tests**: Data persistence and queries

## Running Tests

### Quick Test Run
```bash
npm test
```

### Individual Test Suites
```bash
# Frontend only
npm run test:frontend

# Backend only  
npm run test:backend

# With coverage
npm run test:coverage
```

### Watch Mode (Development)
```bash
cd my-telegram-app && npm run test:watch
cd telegram-app-backend && npm run test:watch
```

## Test Coverage Goals

### Critical Areas (Must Pass)
- ✅ Cart functionality (add, remove, persist)
- ✅ Order creation and validation
- ✅ User authentication (Telegram integration)
- ✅ Product display and filtering
- ✅ API error handling
- ✅ Database operations

### Important Areas (Should Pass)
- ✅ Search functionality
- ✅ Favorites management
- ✅ City selection
- ✅ Telegram bot notifications
- ✅ Admin broadcasting
- ✅ Supplier management

### Nice to Have (Can Fail)
- UI animations and transitions
- Performance optimizations
- Advanced filtering
- Caching mechanisms

## Pre-Deployment Checklist

### Environment Setup
- [ ] `TELEGRAM_BOT_TOKEN` configured
- [ ] `DATABASE_URL` pointing to production DB
- [ ] `JWT_SECRET` set to secure value
- [ ] `CORS_ORIGINS` configured for production domains

### Database Verification
- [ ] All tables exist with correct schema
- [ ] Sample data populated for testing
- [ ] Indexes created for performance
- [ ] Backup strategy in place

### API Testing
- [ ] All endpoints return expected responses
- [ ] Authentication works correctly
- [ ] Error handling is robust
- [ ] Rate limiting configured

### Frontend Testing
- [ ] App loads without errors
- [ ] Telegram integration works
- [ ] Cart persists correctly
- [ ] Checkout flow completes
- [ ] Mobile responsive design

### Integration Testing
- [ ] Frontend connects to backend
- [ ] Orders flow from frontend to delivery agents
- [ ] Admin can broadcast messages
- [ ] Suppliers can manage products

## Test Data Requirements

### Users
```sql
INSERT INTO user_profiles (user_id, full_name, phone_number, address_line1, city, selected_city_id)
VALUES (123456789, 'Test User', '0501234567', 'Test Address', 'Dubai', 1);
```

### Suppliers
```sql
INSERT INTO suppliers (name, email, password_hash, category, is_active)
VALUES ('Test Supplier', 'supplier@test.com', '$2b$10$...', 'Medicine', true);
```

### Products
```sql
INSERT INTO products (name, standardized_name_input, price, category, stock_level, supplier_id)
VALUES ('Test Medicine', 'test-medicine', 100, 'Medicine', 50, 1);
```

### Cities
```sql
INSERT INTO cities (name, is_active) VALUES ('Dubai', true), ('Abu Dhabi', true);
```

## Monitoring and Alerts

### Key Metrics to Monitor
- Order completion rate
- API response times
- Error rates
- User engagement
- Cart abandonment rate

### Critical Alerts
- Database connection failures
- Telegram bot offline
- High error rates (>5%)
- Order processing failures
- Authentication issues

## Deployment Confidence Levels

### 90%+ Confidence
- All critical tests pass
- Load testing completed
- Security audit passed
- Monitoring configured

### 70%+ Confidence (Minimum)
- Core functionality tests pass
- Basic error handling works
- Authentication secure
- Database operations stable

### Below 70%
- Critical bugs present
- Authentication issues
- Data loss risks
- Performance problems

## Common Issues and Solutions

### Test Failures
1. **Database Connection**: Ensure test DB is running
2. **Telegram Mocking**: Check Telegram WebApp mock setup
3. **Async Operations**: Use proper waitFor patterns
4. **Environment Variables**: Verify test environment config

### Performance Issues
1. **Slow Tests**: Mock external API calls
2. **Memory Leaks**: Clear mocks between tests
3. **Database Cleanup**: Reset test data properly

### Integration Problems
1. **CORS Issues**: Configure test origins
2. **Authentication**: Use valid test tokens
3. **Rate Limiting**: Disable in test environment

This testing suite provides comprehensive coverage of your medical expo platform, ensuring reliable deployment with high confidence in system stability and user experience.