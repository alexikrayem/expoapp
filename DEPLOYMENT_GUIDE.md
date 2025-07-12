# Independent Deployment Guide

## Overview
Each application in your supplier platform can be deployed independently. Here's how to prepare and deploy each one.

## 1. Backend API (Core - Deploy First)

### Preparation Steps:
```bash
cd telegram-app-backend
npm install
```

### Environment Variables (.env):
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Secrets (use different secrets for each)
JWT_SECRET=your_supplier_jwt_secret_here
JWT_ADMIN_SECRET=your_admin_jwt_secret_here  
JWT_DELIVERY_SECRET=your_delivery_jwt_secret_here

# Server
PORT=3001
NODE_ENV=production

# CORS Origins (add your deployed frontend URLs)
CORS_ORIGINS=https://your-customer-app.com,https://your-supplier-panel.com
```

### Deployment Options:
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`
- **DigitalOcean App Platform**: Connect GitHub repo
- **VPS**: Use PM2 for process management

### Health Check Endpoint:
Add to your backend:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

## 2. Customer TMA (Telegram Mini App)

### Preparation:
```bash
cd my-telegram-app
npm install
npm run build
```

### Environment Variables (.env.production):
```env
VITE_API_BASE_URL=https://your-backend-api.com
```

### Deployment Options:
- **Netlify**: Drag & drop `dist` folder or connect GitHub
- **Vercel**: `vercel --prod`
- **GitHub Pages**: Enable in repo settings
- **Cloudflare Pages**: Connect repository

### Telegram Bot Setup:
1. Create bot with @BotFather
2. Set web app URL: `/setmenubutton`
3. Configure domain: `/setdomain`

## 3. Delivery Agent TMA

### Preparation:
```bash
cd delivery-agent-tma  
npm install
npm run build
```

### Environment Variables (.env.production):
```env
VITE_DELIVERY_API_BASE_URL=https://your-backend-api.com
```

### Deployment:
Same options as Customer TMA, but separate deployment.

## 4. Supplier Admin Panel

### Preparation:
```bash
cd supplier-admin-panel
npm install
npm run build
```

### Environment Variables (.env.production):
```env
VITE_SUPPLIER_API_BASE_URL=https://your-backend-api.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Deployment:
- **Netlify/Vercel**: For static hosting
- **Custom Domain**: supplier.yourplatform.com

## 5. Platform Admin Panel

### Preparation:
```bash
cd platform-admin-panel
npm install  
npm run build
```

### Environment Variables (.env.production):
```env
VITE_ADMIN_API_BASE_URL=https://your-backend-api.com
```

### Deployment:
- **Secure Hosting**: admin.yourplatform.com
- **IP Restrictions**: Limit access to admin IPs
- **Basic Auth**: Add extra security layer

## Deployment Order & Dependencies

### 1. Deploy Backend First
```bash
# Backend must be live before frontends
cd telegram-app-backend
# Deploy to Railway/Heroku/VPS
```

### 2. Update Frontend Environment Variables
```bash
# Update all frontend .env files with backend URL
VITE_API_BASE_URL=https://your-deployed-backend.com
```

### 3. Deploy Frontends
```bash
# Each can be deployed independently
cd my-telegram-app && npm run build
cd delivery-agent-tma && npm run build  
cd supplier-admin-panel && npm run build
cd platform-admin-panel && npm run build
```

## Domain Structure Recommendation

```
Main Platform: yourplatform.com
├── API: api.yourplatform.com (Backend)
├── Customer: app.yourplatform.com (Customer TMA)  
├── Delivery: delivery.yourplatform.com (Delivery TMA)
├── Supplier: supplier.yourplatform.com (Supplier Panel)
└── Admin: admin.yourplatform.com (Admin Panel)
```

## Quick Start Commands

### Backend (Railway Example):
```bash
cd telegram-app-backend
npm install
railway login
railway init
railway add
railway deploy
```

### Frontend (Netlify Example):
```bash
cd my-telegram-app
npm install
npm run build
# Drag dist folder to netlify.com/drop
```

## Environment Variables Checklist

### Backend:
- [ ] DATABASE_URL
- [ ] JWT_SECRET  
- [ ] JWT_ADMIN_SECRET
- [ ] JWT_DELIVERY_SECRET
- [ ] PORT
- [ ] CORS_ORIGINS

### Customer TMA:
- [ ] VITE_API_BASE_URL

### Delivery TMA:
- [ ] VITE_DELIVERY_API_BASE_URL

### Supplier Panel:
- [ ] VITE_SUPPLIER_API_BASE_URL
- [ ] VITE_CLOUDINARY_CLOUD_NAME
- [ ] VITE_CLOUDINARY_UPLOAD_PRESET

### Admin Panel:
- [ ] VITE_ADMIN_API_BASE_URL

## Testing Deployment

### 1. Backend Health Check:
```bash
curl https://your-backend.com/health
```

### 2. Frontend Connectivity:
- Check browser console for API errors
- Test login functionality
- Verify data loading

### 3. Cross-App Integration:
- Customer can place orders
- Supplier receives orders
- Delivery agent gets assignments
- Admin can manage platform

## Monitoring & Maintenance

### Backend Monitoring:
- Set up error logging (Winston/Morgan)
- Database connection monitoring
- API response time tracking

### Frontend Monitoring:
- Check for console errors
- Monitor API call failures
- Track user interactions

## Security Considerations

### Backend:
- Use HTTPS only
- Implement rate limiting
- Validate all inputs
- Secure JWT secrets

### Admin Panel:
- IP whitelist
- Strong authentication
- Regular security audits
- Backup access methods

## Rollback Strategy

### Backend:
- Keep previous version deployed
- Database migration rollback plan
- Environment variable backup

### Frontend:
- Previous build artifacts
- DNS rollback capability
- CDN cache invalidation

This guide ensures each app can be deployed and maintained independently while working together as a cohesive platform.