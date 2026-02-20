# Vercel Production Deployment Guide

## Project Deployment Links

### Current Live Deployments ✅
- **Backend API**: https://horsestablebackend.vercel.app
- **Frontend**: https://horsestable01.vercel.app
- **GitHub Repository**: https://github.com/LookAround-B/Stable

### Vercel Project Links
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend Project Settings**: Check Vercel dashboard for environment variables

---

## Overview
This guide walks you through deploying the Stable Management System to Vercel with Vercel Postgres.

---

## Step 1: Prepare GitHub Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "prod: prepare for Vercel deployment"
git push origin main
```

---

## Step 2: Set Up Vercel Postgres

1. Go to https://vercel.com/dashboard
2. Click **Storage** → **Create Database** → **Postgres**
3. Choose:
   - **Region**: Closest to your location
   - **Database Name**: `horsestable`
4. Click **Create**
5. Copy the **Connection String** (starts with `postgresql://`)

---

## Step 3: Deploy Backend API to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Project Settings**:
   - **Framework**: Next.js
   - **Root Directory**: `./backend`
   - Click **Continue**

4. **Environment Variables** - Add these:
   ```
   DATABASE_URL = <paste from Vercel Postgres>
   
   JWT_SECRET = <generate a random 32+ character string:
                 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
                 Then paste the output>
   
   NEXT_PUBLIC_API_URL = https://<your-backend-project-name>.vercel.app
   
   AWS_ACCESS_KEY_ID = <your AWS key>
   AWS_SECRET_ACCESS_KEY = <your AWS secret>
   AWS_REGION = us-east-1
   AWS_S3_BUCKET = <your bucket name>
   
   GOOGLE_CLIENT_ID = <your Google OAuth client ID>
   GOOGLE_CLIENT_SECRET = <your Google OAuth secret>
   
   CORS_ORIGIN = https://horsestable.vercel.app,https://www.horsestable.vercel.app
   
   NODE_ENV = production
   ```

5. Click **Deploy**
6. Wait for deployment to complete
7. Note your backend URL: `https://<backend-name>.vercel.app`

---

## Step 4: Deploy Frontend to Vercel

1. Go to https://vercel.com/new again
2. Import the **same** GitHub repository
3. **Project Settings**:
   - **Framework**: Create React App
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - Click **Continue**

4. **Environment Variables** - Add these:
   ```
   REACT_APP_API_URL = https://<your-backend-project-name>.vercel.app/api
   REACT_APP_GOOGLE_CLIENT_ID = <your Google OAuth client ID>
   ```

5. Click **Deploy**
6. Wait for deployment to complete
7. Your frontend will be at: `https://<frontend-project-name>.vercel.app`

---

## Step 5: Update Backend CORS (if needed)

If your frontend has a custom domain, update backend environment variable:

```
CORS_ORIGIN = https://yourdomain.com,https://api.yourdomain.com
```

---

## Step 6: Database Migrations

Vercel will automatically run migrations on deploy IF you set the Build Command correctly.

To manually migrate in production:

```bash
DATABASE_URL="<connection-string>" npx prisma migrate deploy
```

To seed production database (if needed):

```bash
DATABASE_URL="<connection-string>" npx prisma db seed
```

---

## Step 7: Testing Production

1. Visit your frontend URL: `https://<frontend-name>.vercel.app`
2. Test user login
3. Create a test meeting
4. Verify it appears in Upcoming/Past filters
5. Test MOM form after meeting time passes
6. Verify Gmail link works

---

## Step 8: Production Checklist

- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Database migrations completed
- [ ] CORS configured for both domains
- [ ] Environment variables set on Vercel
- [ ] User login works
- [ ] Meeting creation works
- [ ] File uploads working (S3)
- [ ] Notifications appearing
- [ ] MOM form accessible

---

## Troubleshooting

### 502/503 Errors
- Check backend logs in Vercel dashboard
- Verify DATABASE_URL is correct
- Check if Prisma migrations ran successfully

### CORS Errors
- Check CORS_ORIGIN environment variable
- Make sure frontend domain is whitelisted

### Database Connection Failures
```bash
# Test connection locally
DATABASE_URL="<your-connection-string>" npx prisma db execute --stdin
```

### Migrations Not Running
```bash
# Manually run migrations
DATABASE_URL="<connection-string>" npx prisma migrate deploy
```

---

## Recent Fixes (February 20, 2026)

### Fixed Issues
1. **CORS Headers**: Added proper Cross-Origin-Opener-Policy and security headers to next.config.js
2. **Google Auth 405 Error**: Fixed missing CORS headers and proper request handling in google.ts endpoint
3. **TypeScript Compilation**: Removed unused CORS middleware imports and declarations from 26+ API files
4. **Package Dependencies**: 
   - Updated axios 1.3.4 → 1.7.7
   - Updated dotenv 16.0.3 → 16.4.5
   - Updated express-validator 7.0.0 → 7.1.0
   - Updated jsonwebtoken 9.0.0 → 9.0.2
   - Updated @prisma/client 5.0.0 → 5.18.0
5. **Deprecated AWS SDK v2**: Removed aws-sdk dependency (deprecated); using local file uploads instead

### Latest Deployment Status
- **Commit**: efb3f7b (Add correct Vercel frontend domain to CORS origins)
- **Build Status**: ✅ Passing
- **Frontend**: https://horsestable01.vercel.app
- **Backend**: https://horsestablebackend.vercel.app
- **Last Updated**: February 20, 2026

### Deployed Endpoints
All API routes compiled and deployed successfully:
- ✅ /api/auth/google - Google OAuth login (CORS fixed ✅)
- ✅ /api/auth/login - Email/password login
- ✅ 50+ operational endpoints
- ✅ CORS headers properly configured
- ✅ OPTIONS preflight requests handled

---

---

## Security Notes

✅ **DO:**
- Use environment variables for all secrets
- Never commit `.env` files
- Use strong JWT_SECRET (32+ chars)
- Enable Vercel project protection
- Use HTTPS only (Vercel default)

❌ **DON'T:**
- Expose database URL in frontend code
- Hardcode API keys
- Use weak passwords
- Disable CORS security

---

## Next Steps

After deployment:
1. Set up custom domain (optional)
2. Configure SSL certificate (automatic with Vercel)
3. Set up monitoring/alerts
4. Configure auto-deployments from main branch
5. Add backup strategy for database

---

## Questions?

Refer to:
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
