# Production Deployment Checklist

## Pre-Deployment: Code Quality

### Backend
- [ ] All API routes have proper error handling
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Console.log statements removed from production code
- [ ] TypeScript compilation: `npm run build` succeeds
- [ ] Prisma schema reviewed
- [ ] Database indexes added for frequently queried fields

### Frontend
- [ ] All API calls have error handling & loading states
- [ ] No console.log statements in production code
- [ ] Environment variables properly set
- [ ] Build succeeds: `npm run build`
- [ ] No hardcoded URLs or API keys
- [ ] Performance optimized (image lazy loading, code splitting)
- [ ] Mobile responsive tested

---

## Infrastructure Setup

### Vercel Account
- [ ] Vercel account created (vercel.com)
- [ ] GitHub repository connected
- [ ] Team/billing configured

### Database
- [ ] Vercel Postgres database created
- [ ] Connection string obtained
- [ ] Backups enabled (if available in tier)
- [ ] Region selected for best performance

### External Services
- [ ] AWS S3 bucket created & configured
- [ ] AWS IAM credentials generated (access key + secret)
- [ ] Google OAuth credentials created (for login)
- [ ] Email service configured (if sending emails)

---

## Environment Configuration

### Backend (.env.production in Vercel)
- [ ] DATABASE_URL set correctly
- [ ] JWT_SECRET generated (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] NEXT_PUBLIC_API_URL matches backend domain
- [ ] AWS credentials configured
- [ ] Google OAuth credentials set
- [ ] CORS_ORIGIN includes frontend domain(s)
- [ ] NODE_ENV = production

### Frontend (.env.production in Vercel)
- [ ] REACT_APP_API_URL points to backend `/api`
- [ ] REACT_APP_GOOGLE_CLIENT_ID set
- [ ] No other environment-specific secrets

---

## Deployment Steps

### Step 1: Deploy Backend
- [ ] Vercel project created for backend
- [ ] Root directory set to `./backend`
- [ ] All environment variables configured
- [ ] Build successful
- [ ] Prisma migrations auto-ran or manually executed
- [ ] API endpoints responsive: test `/api/health` or similar

### Step 2: Deploy Frontend
- [ ] Vercel project created for frontend
- [ ] Root directory set to `./frontend`
- [ ] Environment variables configured with correct API_URL
- [ ] Build successful
- [ ] Frontend loads without errors

### Step 3: Post-Deployment Verification
- [ ] Frontend accessible and loads
- [ ] User can login successfully
- [ ] API calls working (check Network tab in DevTools)
- [ ] No CORS errors in console
- [ ] Database operations working (create user, save data)
- [ ] File uploads working (S3)
- [ ] Email notifications working
- [ ] All major features tested

---

## Security Verification

### Access Control
- [ ] Authentication required for all protected endpoints
- [ ] Role-based access control working
- [ ] Unauthorized users cannot access admin functions
- [ ] JWT tokens properly validated on backend

### Data Protection
- [ ] Database passwords not in code
- [ ] API keys not exposed in frontend
- [ ] HTTPS enforced (Vercel default)
- [ ] CORS properly restricted
- [ ] SQL injection prevention confirmed

### Monitoring
- [ ] Error logging configured
- [ ] Exception tracking set up (e.g., Sentry)
- [ ] Performance monitoring enabled
- [ ] Database query logging reviewed

---

## Performance Checks

### Backend
- [ ] API response times < 500ms
- [ ] Database queries optimized (no N+1 queries)
- [ ] File upload size limits enforced
- [ ] Rate limiting configured

### Frontend
- [ ] Bundle size optimized
- [ ] Images optimized and lazy-loaded
- [ ] Code splitting implemented
- [ ] CSS minified
- [ ] First Contentful Paint < 3s

---

## Monitoring & Maintenance

### Logging
- [ ] Backend logs accessible in Vercel dashboard
- [ ] Error logs monitored regularly
- [ ] Performance metrics tracked

### Backups
- [ ] Database backups scheduled (if using managed service)
- [ ] Backup tests performed
- [ ] Recovery procedure documented

### Updates
- [ ] Dependencies reviewed for security patches
- [ ] Prisma client updated
- [ ] Node version updated to latest LTS
- [ ] Next.js/React updated if necessary

---

## Documentation

- [ ] Deployment procedure documented
- [ ] Environment variables documented
- [ ] API contract documented
- [ ] How to scale documented
- [ ] Disaster recovery plan documented
- [ ] On-call procedures documented

---

## Post-Launch

- [ ] Monitor application for 24 hours
- [ ] Check server logs regularly
- [ ] Set up alerts for errors
- [ ] Plan for scaling if needed
- [ ] Schedule regular security audits
- [ ] Plan for regular backups and testing

---

## Sign-Off

- [ ] QA Testing Complete: ________________
- [ ] Deployment Approved By: ________________
- [ ] Production Deployment Date: ________________
- [ ] Notes: ________________

---

## Rollback Plan

If critical issues occur:

1. Check Vercel dashboard for deployment history
2. Click on previous successful deployment
3. Click "Redeploy" to rollback
4. Database: run previous migration version if schema changed
5. Communicate with users about the rollback

