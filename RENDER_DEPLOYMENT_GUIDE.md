# Render Deployment Guide

This guide walks through deploying the Horse Stable Management System to Render with PostgreSQL.

## Prerequisites

- Render account (create at https://render.com)
- GitHub repository with this code
- Google OAuth credentials

## Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

## Step 2: Deploy Backend Service

### Option A: Using render.yaml (Recommended)

1. Push the `backend/render.yaml` file to your GitHub repository's main branch
2. In Render dashboard, click **New** → **Blueprint**
3. Select your GitHub repository (LookAround-B/Stable)
4. Render will automatically detect and deploy both the web service and PostgreSQL database

### Option B: Manual Deployment

#### Create PostgreSQL Database
1. Go to Render dashboard → **New** → **PostgreSQL**
2. Choose name: `horsestable-db`
3. Select **Free Plan** (note: data resets monthly)
4. Click **Create Database**
5. Once created, copy the **Internal Database URL** (you'll need this)

#### Create Web Service
1. Go to Render dashboard → **New** → **Web Service**
2. Connect your GitHub repository `LookAround-B/Stable`
3. Fill in settings:
   - **Name**: `horsestable-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm ci --include=dev && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free

4. Click **Advanced** and add Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (paste the PostgreSQL Internal Database URL from step above)
   - `JWT_SECRET` = (generate random: `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` = (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console)

5. Click **Create Web Service**
6. Wait for build to complete (~3-5 minutes)
7. Once deployed, copy the service URL (e.g., `https://horsestable-backend.onrender.com`)

## Step 3: Run Database Migrations

After the backend deploys:

1. In Render dashboard, find your web service `horsestable-backend`
2. Click **Shell** tab
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. (Optional) Seed data:
   ```bash
   npm run seed
   ```

## Step 4: Update Frontend

1. Update [frontend/.env.production](../frontend/.env.production):
   ```
   REACT_APP_API_URL=https://horsestable-backend.onrender.com/api
   ```

2. Commit and push to GitHub

3. Frontend will auto-deploy on Vercel

## Step 5: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Update OAuth 2.0 credentials:
   - Add Authorized redirect URI:
     ```
     https://horsestable-backend.onrender.com/api/auth/google
     ```
   - Add Authorized JavaScript origins:
     ```
     https://horsestable01.vercel.app
     https://horsestablebackend.onrender.com
     ```

## Step 6: Test Deployment

1. Open your frontend: `https://horsestable01.vercel.app`
2. Try **Sign in with Google**
3. Check browser DevTools (F12) → Network tab for `/api/auth/google`:
   - Status should be **200**
   - Headers should show `access-control-allow-origin`

## Important Notes

### Free Plan Limitations
- Services spin down after 15 minutes of inactivity (~$0/month)
- PostgreSQL data resets monthly
- For production, upgrade to paid plans

### CORS Headers
Render properly handles CORS headers set in code, so all 49 endpoints will work correctly without the vercel.json workaround.

### Environment Variables
- Keep `JWT_SECRET` private - never commit to GitHub
- Store OAuth credentials in Render dashboard, not in code

## Troubleshooting

**Build fails**: Check logs in Render dashboard → Service → Logs

**Database connection error**: Verify `DATABASE_URL` is correct in Environment Variables

**CORS still blocked**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Test in incognito window
3. Check that `access-control-allow-origin` header is present

**"Cannot find module" errors**: Ensure `npm ci --include=dev` runs before build

## Useful Commands

Deploy a specific branch:
```bash
# Push to a branch other than main to create preview deployment
git push origin feature-branch
```

View live logs:
1. Render dashboard → Service → Logs
2. Tail logs in real-time

SSH into service:
```bash
# From Render dashboard → Service → Shell
```

## Next Steps

- Monitor service health in Render dashboard
- Set up error notifications
- Consider upgrading to paid plan for production use
- Enable auto-redeploy for GitHub commits
