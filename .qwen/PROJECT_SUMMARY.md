# Project Summary

## Overall Goal
Replace Telegram-based authentication with phone-number OTP authentication while maintaining JWT-based security for all API requests.

## Key Knowledge
- **Technology Stack**: React frontend, Node.js/Express backend, JWT authentication
- **Authentication Flow**: Phone OTP → Backend validation → JWT token generation → JWT-based API requests
- **Architecture**: Backend uses JWT middleware for route protection, frontend stores tokens in localStorage
- **Environment Variables**: VITE_DEV_BYPASS_SECRET for development
- **Frontend Components**: AppInitializer.jsx (handles auth flow), authService.js (auth methods), apiClient.js (JWT-based API calls)
- **Backend Routes**: `/auth/send-otp`, `/auth/verify-otp`, `/auth/register-phone`, JWT middleware for protected routes
- **Development Commands**: `npm run dev` for frontend, uses Vite and Vitest for testing

## Recent Actions
- **[DONE]** Implemented phone OTP endpoints (`send-otp`, `verify-otp`, `register-phone`)
- **[DONE]** Updated authentication middleware to use JWT tokens for protected routes
- **[DONE]** Updated frontend authService to use phone OTP flows
- **[DONE]** Removed Telegram Login Widget/verify flows from backend and frontend

## Current Plan
- **[DONE]** Complete transition from Telegram auth to phone OTP authentication
- **[DONE]** Ensure all components work with JWT-based user identification
- **[DONE]** Maintain development mode functionality with bypass headers
- **[DONE]** Update all related files and tests to remove old authentication approach
- **[DONE]** Verify that customer app only uses phone OTP authentication method

The project now uses phone OTP authentication with JWT tokens for all API communications, replacing the previous Telegram-based approaches.

---

## Summary Metadata
**Update time**: 2026-02-08T00:00:00.000Z 
