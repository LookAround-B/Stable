# GitHub Workflow Guide - Horse Stable Management System

**Document Version:** 1.0
**Last Updated:** February 9, 2026
**Project:** Horse Stable Management System
**Repository:** https://github.com/LookAround-B/Stable

---

## Table of Contents

1. [Initial Setup (Already Done)](#initial-setup)
2. [Daily Workflow - Updating GitHub](#daily-workflow)
3. [Common Git Commands](#common-git-commands)
4. [Team Collaboration](#team-collaboration)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Initial Setup (Already Done)

### What Was Already Configured:

✅ Repository created at: https://github.com/LookAround-B/Stable
✅ Write permissions granted to: SaiAkhil066
✅ Initial commit pushed with 197 files
✅ All dependencies tracked in package.json
✅ .gitignore configured to protect sensitive files
✅ Environment templates (.env.example) created

### What Was NOT Pushed (Protected):

- `.env` files (contains API keys, database passwords)
- `node_modules/` folders (too large, recreated with npm install)
- `/build` and `/dist` folders (regenerated on build)
- IDE settings (`.vscode/`, `.idea/`)
- OS files (Thumbs.db, .DS_Store)

---

## Daily Workflow - Updating GitHub

### **Every Time You Make Changes:**

#### **Method 1: Quick 3-Command Method (Recommended)**

```powershell
cd "d:\AI Projects\horsestable"
git add .
git commit -m "Brief description of changes"
git push
```

#### **Method 2: Step-by-Step Method**

**Step 1: Navigate to project root**
```powershell
cd "d:\AI Projects\horsestable"
```

**Step 2: Check what changed**
```powershell
git status
```
This shows:
- Red files: Modified but not staged
- Green files: Staged and ready to commit

**Step 3: Stage your changes**
```powershell
git add .
```
Or to add specific file:
```powershell
git add frontend/src/pages/DashboardPage.js
```

**Step 4: Commit with descriptive message**
```powershell
git commit -m "Add user greeting with name and role on dashboard"
```

**Step 5: Push to GitHub**
```powershell
git push origin main
```

Or simply:
```powershell
git push
```

---

## Common Git Commands

### **View Changes Before Committing**

```powershell
# See what files changed
git status

# See detailed changes in files
git diff

# See your commit history
git log --oneline

# See last 5 commits
git log -5

# See changes made by specific person
git log --author="SaiAkhil066"
```

### **Commit Messages - Write Good Ones!**

**Good Examples:**
```
git commit -m "Add task filtering for groomers and admins"
git commit -m "Fix dashboard greeting to show name and role"
git commit -m "Update Google OAuth button styling"
git commit -m "Implement attendance toggle switches"
git commit -m "Fix ESLint warnings in AttendancePage"
```

**Bad Examples:**
```
git commit -m "changes"           # Too vague
git commit -m "fixed bug"         # Which bug?
git commit -m "update"            # Not descriptive
git commit -m "blah"              # Unprofessional
```

### **Undo Changes (Before Committing)**

```powershell
# Discard changes in one file
git checkout -- frontend/src/pages/DashboardPage.js

# Discard all changes
git checkout -- .

# Unstage a file
git reset HEAD frontend/src/pages/DashboardPage.js

# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Undo last commit (deletes changes)
git reset --hard HEAD~1
```

### **View Remote Repository**

```powershell
# See remote URL
git remote -v

# See branches
git branch -a

# See all commits on GitHub
git log origin/main

# Fetch latest from GitHub without merging
git fetch origin
```

---

## Team Collaboration

### **When Working with Team Members:**

#### **Pull Latest Changes Before Starting Work**
```powershell
cd "d:\AI Projects\horsestable"
git pull origin main
```

#### **Create a Feature Branch (Optional but Recommended)**
```powershell
# Create and switch to new branch
git checkout -b feature/task-filtering

# Make your changes...

# Push your branch
git push origin feature/task-filtering
```

Then on GitHub, create a **Pull Request** to merge into main.

#### **If There Are Conflicts**

```powershell
# See conflicting files
git status

# Open conflicting file and manually fix it

# After fixing, commit as normal
git add .
git commit -m "Resolve merge conflicts"
git push
```

---

## Troubleshooting

### **Problem: "fatal: unable to access repository"**

**Solution:** Check your internet connection and GitHub permissions
```powershell
# Test connection
git remote -v

# Update remote if needed
git remote set-url origin https://github.com/LookAround-B/Stable.git
```

### **Problem: "Please tell me who you are" error**

**Solution:** Configure git user (one-time setup)
```powershell
git config user.name "SaiAkhil066"
git config user.email "saiakhil066@gmail.com"

# Or set globally
git config --global user.name "SaiAkhil066"
git config --global user.email "saiakhil066@gmail.com"
```

### **Problem: "Your branch is ahead of 'origin/main' by X commits"**

**Solution:** You need to push
```powershell
git push origin main
```

### **Problem: "Rejected (non-fast-forward)"**

**Solution:** Someone else pushed changes. Pull first:
```powershell
git pull origin main
# Resolve any conflicts if needed
git push origin main
```

### **Problem: "File too large" error**

**Solution:** Check .gitignore is configured properly
- node_modules should be ignored
- build/ should be ignored
- .env should be ignored

---

## Best Practices

### ✅ **DO:**

1. **Commit frequently** - Small, logical commits (not huge changes at once)
2. **Pull before pushing** - Always get latest code first
3. **Write clear messages** - Future you will thank present you
4. **Review changes before committing** - Use `git diff`
5. **Push at end of day** - Backup your work
6. **Use meaningful branch names** - feature/xyz, bugfix/xyz

### ❌ **DON'T:**

1. Don't commit without testing - Test your changes first
2. Don't push .env or sensitive files - Check .gitignore
3. Don't commit node_modules - They're huge and unnecessary
4. Don't force push to main - Only do this if absolutely necessary
5. Don't ignore merge conflicts - Fix them properly

---

## Quick Reference Card

### **Minimum Daily Commands:**

```powershell
# Make your changes in VS Code, then...

# Check what changed
git status

# Stage everything
git add .

# Commit with message
git commit -m "Your description"

# Push to GitHub
git push

# Done! Check at: https://github.com/LookAround-B/Stable
```

### **Weekly Check:**

```powershell
# See all your commits this week
git log --since="7 days ago" --oneline

# See what team pushed
git log origin/main --oneline -10
```

---

## For Your Team

When team members clone the repo for the first time:

```powershell
# Clone
git clone https://github.com/LookAround-B/Stable.git
cd Stable

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# (Fill in credentials)

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd backend
npx prisma migrate deploy
npx prisma db seed

# Start servers
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm start
```

---

## Important Files for GitHub

### **Backend**
- `backend/package.json` - Dependencies (tracks what's needed)
- `backend/.env.example` - Template for credentials
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/pages/api/` - All API endpoints

### **Frontend**
- `frontend/package.json` - Dependencies
- `frontend/.env.example` - Template for React variables
- `frontend/src/` - All React components and pages

### **Configuration**
- `.gitignore` - What NOT to push
- `README.md` - Project overview
- Documentation files - Setup guides

### **DO NOT PUSH**
- `.env` (has secrets)
- `.env.local` (has secrets)
- `node_modules/` (too large)
- `/build`, `/dist` (auto-generated)
- IDE settings (personal preference)

---

## Summary

**To update GitHub with your changes:**

1. Make changes in VS Code
2. Run: `git add .`
3. Run: `git commit -m "description"`
4. Run: `git push`
5. Done! Check https://github.com/LookAround-B/Stable to verify

That's it! Do this workflow every time you make changes, and your GitHub will stay in sync with your local code.

---

**Questions?** Refer back to this guide or check the repository README.

**Repository:** https://github.com/LookAround-B/Stable
**Commit History:** https://github.com/LookAround-B/Stable/commits/main
