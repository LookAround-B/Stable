# Google OAuth Setup Guide

## Overview
Users can now log in using their Google account in addition to email/password authentication.

## How It Works

1. **User clicks "Sign in with Google"** button on login page
2. **Google authentication popup** appears
3. **User logs in with their Google account**
4. **Backend verifies** the Google token
5. **User account is created** if it's their first time (auto-assigned as "Groom" role)
6. **User is logged in automatically** without needing to enter password

## Setup Instructions

### Step 1: Get Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google+ API**:
   - Click on "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 Credentials:
   - Go to "Credentials" tab
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized origins:
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `http://localhost:3002`
     - Add your production domain later
   - Add authorized redirect URIs:
     - `http://localhost:3000`
     - `http://localhost:3001`
   - Copy your **Client ID** (looks like: `123456789-abcdefgh.apps.googleusercontent.com`)

### Step 2: Set Environment Variable in Frontend

In your `.env.local` file (frontend root):
```
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

Example:
```
REACT_APP_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
```

### Step 3: Restart Frontend Server

```bash
cd frontend
npm start
```

## Features Implemented

✅ **Google Login Button** on LoginPage
✅ **Token Verification** on backend
✅ **Automatic User Creation** for first-time Google OAuth users
✅ **JWT Token Generation** after successful Google login
✅ **Fallback Email/Password** login still available
✅ **Profile Picture** synced from Google account

## User Flow

### First Time Google Login
1. User clicks "Sign in with Google"
2. Authenticates with Google
3. Backend creates new account automatically
4. Default role: **Groom** (admin must update role later)
5. Account status: **Pending Approval** (admin approval required)
6. User is logged in and can access system

### Returning Google Login
1. User clicks "Sign in with Google"
2. Backend finds existing account
3. User is logged in immediately
4. No need to re-authenticate

### Email/Password Still Works
- Existing users can continue using email + password
- Both login methods use the same authentication system
- Can switch between login methods (same email)

## Database Changes

Two new fields added to Employee model:
- `profileImage`: Stores Google profile picture URL
- `isApproved`: Tracks if admin has approved the account

## Security Notes

⚠️ **Important for Production:**
1. Replace `REACT_APP_GOOGLE_CLIENT_ID` with actual Client ID
2. Ensure `JWT_SECRET` is set in backend .env
3. Use HTTPS in production
4. Google token expiry is handled by Google (refresh tokens if needed)
5. Auto-created accounts need admin approval before full access

## Troubleshooting

### "Error: audience mismatch" 
- Check that Client ID in frontend matches Google Console settings
- Verify localhost:3000/3001 is in Authorized Origins

### "Invalid token"
- Ensure Google+ API is enabled in Cloud Console
- Check Client ID is correct
- Token may have expired (user needs to log in again)

### User Created but Can't Access System
- New Google OAuth users are created with default "Groom" role
- They need admin approval to access full system
- Go to Team Members page and click "Approve" for new users

## Testing Google OAuth

**Test Credentials (Email/Password):**
- admin@test.com / password123
- groom@test.com / password123

**Test Google Login:**
- Use your personal Google account
- First login will create a new "Groom" account
- Subsequent logins will use that account

## Code Files Modified

**Frontend:**
- `src/App.js` - Added GoogleOAuthProvider wrapper
- `src/pages/LoginPage.js` - Added Google login button
- `src/services/authService.js` - Added loginWithGoogle function
- `src/styles/LoginPage.css` - Added Google button styling

**Backend:**
- `src/pages/api/auth/google.ts` - Google token verification endpoint

**Configuration:**
- `.env.local` (frontend) - REACT_APP_GOOGLE_CLIENT_ID

## Next Steps

1. Get Google Client ID from Cloud Console
2. Add Client ID to `.env.local` in frontend folder
3. Restart frontend server (`npm start`)
4. Test by clicking "Sign in with Google" on login page

