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

### Step 5: Deploy
- Click **Create Web Service**
- Wait for build to complete (3-5 minutes)
- You'll see a URL like: `https://horsestable-backend.onrender.com`

---

## AFTER DEPLOYMENT

### Run Database Migrations
1. Go to your service in Render dashboard
2. Click **Shell** tab
3. Run:
   ```
   npx prisma migrate deploy
   ```

### Seed Test Data (Optional)
In Shell, run:
```
npm run seed
```

---

## TROUBLESHOOTING

**Build fails?**
- Check Logs tab for error messages
- Ensure Node version is compatible (should be 18+)

**Database connection error?**
- Verify DATABASE_URL is correct (copy from above)
- Make sure password characters are not escaped

**Permission denied on database?**
- Database may take a minute to be ready
- Try redeploy from dashboard

---

## NEXT: Update Frontend

Once backend URL is ready (e.g., `https://horsestable-backend.onrender.com`):

Update `frontend/.env.production`:
```
REACT_APP_API_URL=https://horsestable-backend.onrender.com/api
```

Then commit and push → Frontend auto-deploys on Vercel
