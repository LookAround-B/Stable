# Google OAuth Setup - COMPLETE ✅

## Credentials Added

✅ **Frontend (.env.local):**
- `REACT_APP_GOOGLE_CLIENT_ID=244506553129-hcdjduecje6h3lt29umvdokatroau63p.apps.googleusercontent.com`

✅ **Backend (.env):**
- `GOOGLE_CLIENT_ID=244506553129-hcdjduecje6h3lt29umvdokatroau63p.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET=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`

## System Status

✅ **Frontend Server**: Running on http://localhost:3001
✅ **Backend Server**: Running on http://localhost:3000
✅ **Google OAuth Integration**: Complete

## How to Test Google OAuth

### 1. Go to Login Page
- Open http://localhost:3001 in your browser
- You should see TWO login options:
  - **Email + Password** (traditional login)
  - **Sign in with Google** (new OAuth button)

### 2. Test Email/Password Login (Existing Users)
Use these test credentials:
- Email: `admin@test.com`
- Password: `password123`

### 3. Test Google Login (New Users)
- Click **"Sign in with Google"** button
- A Google authentication popup will appear
- Log in with your personal Google account
- System will automatically:
  1. Verify your Google account
  2. Create a new user account with default role: **Groom**
  3. Set account status: **Pending Approval**
  4. Log you in automatically

### 4. For Returning Google Users
- Click **"Sign in with Google"** again
- System will recognize your Google account
- You'll be logged in immediately (no password needed)

## What Happens Behind the Scenes

1. **Frontend** (`src/pages/LoginPage.js`):
   - User clicks "Sign in with Google"
   - Google popup opens
   - User authenticates with Google
   - Google returns authentication token

2. **Backend** (`src/pages/api/auth/google.ts`):
   - Frontend sends Google token to backend
   - Backend verifies token with Google's servers
   - Checks if user exists in database
   - If new user:
     - Creates account with default role "Groom"
     - Sets status to "Pending Approval"
     - Syncs profile picture from Google
   - Generates JWT token for session
   - Returns user info and JWT token

3. **Frontend** (`src/App.js`):
   - Receives JWT token and user info
   - Stores token in localStorage
   - Redirects to dashboard
   - User is logged in!

## User Data Synced from Google

When a user logs in with Google, these fields are synced:
- ✅ Full Name
- ✅ Email Address
- ✅ Profile Picture (from Google account)
- ⚠️ Role: Auto-set to "Groom" (admin can change later)
- ⚠️ Status: Auto-set to "Pending Approval"

## Next Steps for Admins

When new users sign up via Google OAuth:

1. Go to **Team Members** page (http://localhost:3001/employees)
2. Look for users with status **"⏳ Pending"**
3. Click the **Approve** button to activate their account
4. Go to edit and change their role if needed

## Important Notes

⚠️ **Auto-Created Accounts:**
- New Google users are created with "Groom" role by default
- Admin approval required before full system access
- Admin can change role/permissions after approval

✅ **Existing Users:**
- Can continue using email + password
- Can also use Google OAuth if email matches
- Both methods use same account

🔐 **Security:**
- Google tokens are verified server-side
- Tokens expire after 7 days
- Passwords are hashed with bcryptjs
- No plain text passwords stored

## Troubleshooting

### "Sign in with Google" button not showing?
- Make sure `.env.local` is set in frontend folder
- Restart frontend server (`npm start`)
- Clear browser cache and refresh

### "Invalid token" error?
- Check Client ID matches in frontend and backend
- Ensure Google+ API is enabled in Google Cloud Console
- Try logging out and logging back in

### Can't access system after Google login?
- Check that admin has approved your account
- Go to `/employees` page to see approval status
- Ask admin to click "Approve" button

## Files Modified

✅ Frontend:
- `src/App.js` - GoogleOAuthProvider wrapper
- `src/pages/LoginPage.js` - Google login button
- `src/services/authService.js` - loginWithGoogle function
- `src/styles/LoginPage.css` - Google button styling
- `.env.local` - Google Client ID

✅ Backend:
- `src/pages/api/auth/google.ts` - Token verification
- `.env` - Google credentials

## Testing Checklist

- [ ] Frontend loads at http://localhost:3001
- [ ] Login page shows "Sign in with Google" button
- [ ] Email/Password login still works
- [ ] Click Google button opens authentication popup
- [ ] First-time Google login creates account
- [ ] Returning Google login recognizes account
- [ ] Admin can approve new users
- [ ] User can access dashboard after approval

## Production Checklist

Before deploying to production:
- [ ] Update Google OAuth credentials for production domain
- [ ] Change `JWT_SECRET` in backend .env
- [ ] Use HTTPS (required for Google OAuth)
- [ ] Update Google Cloud Console with production URLs
- [ ] Remove test credentials from documentation
- [ ] Set up email notifications for new user approvals
- [ ] Configure role assignment workflow

---

**Status**: ✅ Google OAuth is fully configured and ready to use!

Visit http://localhost:3001 and test it out! 🚀
