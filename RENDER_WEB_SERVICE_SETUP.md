# Render Web Service Deployment - Step by Step

## Your Database Details (Save for reference)

```
Host: dpg-d6cb46ogjchc73eb2qf0-a.oregon-postgres.render.com
Port: 5432
Database: horsestable_db
Username: horsestable_db_user
Password: qGwcya0SOqpDd21QYRbLSDUJGnAtQAEA

DATABASE_URL (Use this in env vars):
postgresql://horsestable_db_user:qGwcya0SOqpDd21QYRbLSDUJGnAtQAEA@dpg-d6cb46ogjchc73eb2qf0-a.oregon-postgres.render.com/horsestable_db
```

---

## CREATE WEB SERVICE ON RENDER

### Step 1: Go to Render Dashboard
- Log in to https://dashboard.render.com
- Click **New** button (top right)
- Select **Web Service**

### Step 2: Connect GitHub Repository
- Click "Connect your GitHub account" (if not already connected)
- Search for: `LookAround-B/Stable`
- Click **Connect** next to the repository
- Select branch: **main**
- Click **Next**

### Step 3: Configure Service Settings

**Basic Settings:**
- **Name**: `horsestable-backend`
- **Environment**: Node
- **Build Command**: `npm ci --include=dev && npm run build`
- **Start Command**: `npm run start`
- **Root Directory**: `backend` ← **IMPORTANT**
- **Plan**: **Free** (click Free radio button)

### Step 4: Add Environment Variables
Click **Advanced** to expand, then click **Add Environment Variable** for each:

#### **REQUIRED (5 env vars):**
1. `NODE_ENV` = `production`

2. `DATABASE_URL` = 
```
postgresql://horsestable_db_user:qGwcya0SOqpDd21QYRbLSDUJGnAtQAEA@dpg-d6cb46ogjchc73eb2qf0-a.oregon-postgres.render.com/horsestable_db
```

3. `JWT_SECRET` = Generate random string using one of these commands:
   - Windows PowerShell: `[System.Convert]::ToBase64String([System.Random]::new().GetBytes(32))`
   - Or use: `openssl rand -base64 32`
   - Or generate at: https://randomkeygen.com/

4. `GOOGLE_CLIENT_ID` = (from Google Cloud Console OAuth credentials)

5. `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console OAuth credentials)

#### **OPTIONAL BUT RECOMMENDED (3 env vars):**
6. `JWT_EXPIRE` = `7d`

7. `FRONTEND_URL` = `https://horsestable01.vercel.app`

8. `CORS_ORIGIN` = 
```
http://localhost:3001,http://localhost:3002,http://localhost:3000,https://horsestable01.vercel.app,https://horsestable-backend.onrender.com
```

#### **IF USING FILE UPLOADS - AWS S3 (4 env vars):**
9. `AWS_ACCESS_KEY_ID` = (your AWS access key)

10. `AWS_SECRET_ACCESS_KEY` = (your AWS secret key)

11. `AWS_REGION` = `us-east-1`

12. `AWS_S3_BUCKET` = (your S3 bucket name)

### Step 5: Deploy
- Click **Create Web Service**
- Wait for build to complete (3-5 minutes)
- You'll see a URL like: `https://horsestable-backend.onrender.com`

---

## YOUR BACKEND URL
Once deployed, copy your URL from the Render dashboard. It will look like:
```
https://horsestable-backend.onrender.com
```

---

## AFTER DEPLOYMENT - RUN MIGRATIONS

### Step 1: SSH into Shell
1. Go to your service in Render dashboard: https://dashboard.render.com
2. Select service: `horsestable-backend`
3. Click **Shell** tab (at the top)

### Step 2: Run Database Migrations
In the shell, run:
```bash
npx prisma migrate deploy
```

This will create all database tables.

### Step 3: Seed Test Data (Optional)
To populate test data:
```bash
npm run seed
```

---

## CONFIGURE GOOGLE OAUTH

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Click **Edit** 
4. Add these Authorized redirect URIs:
   ```
   https://horsestable-backend.onrender.com/api/auth/google
   ```
5. Add these Authorized JavaScript origins:
   ```
   https://horsestable01.vercel.app
   https://horsestable-backend.onrender.com
   ```
6. Click **Save**

---

## UPDATE FRONTEND

**Build fails?**
- Check Logs tab for error messages
- Ensure Node version is compatible (should be 18+)

**Database connection error?**
- Verify DATABASE_URL is correct (copy from above)
- Make sure password characters are not escaped

**Permission denied on database?**
- Database may take a minute to be ready
- Try redeploy from dashboard

## UPDATE FRONTEND

Update `frontend/.env.production`:
```
REACT_APP_API_URL=https://horsestable-backend.onrender.com/api
```

Then:
1. Commit and push to GitHub: `git add . && git commit -m "Update API URL to Render backend" && git push origin main`
2. Frontend auto-deploys on Vercel within 1-2 minutes

---

## TEST GOOGLE OAUTH

1. Open https://horsestable01.vercel.app (wait 1-2 min for frontend to deploy)
2. Click "Sign in with Google"
3. Open DevTools (F12) → **Network** tab
4. Find OPTIONS request to `/api/auth/google`
5. Verify:
   - Status: **200** ✅
   - Header: `access-control-allow-origin: *` or specific domain ✅
6. OAuth popup should open without COOP errors

---

## TROUBLESHOOTING
