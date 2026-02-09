# Quick Start Guide

## 🚀 Get Started in 5 Steps

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Setup Environment
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database and AWS credentials

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env if needed (defaults usually work for development)
```

### Step 3: Create Database
```bash
# Create database and tables
mysql -u root -p < database/schema.sql

# Add initial settings
mysql -u root -p stable_management < database/seed.sql
```

### Step 4: Start the Application
```bash
# Terminal 1 - Start Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Start Frontend (port 3000)
cd frontend
npm start
```

### Step 5: Access the Application
- Open browser and go to: **http://localhost:3000**
- Login with any email address
- Complete profile setup
- Start using the system!

## 📂 Important Directories

| Path | Purpose |
|------|---------|
| `backend/src/routes/` | API endpoint definitions |
| `backend/src/models/` | Database models |
| `frontend/src/pages/` | React page components |
| `frontend/src/components/` | Reusable React components |
| `frontend/src/services/` | API service layer |
| `database/` | SQL schema and seeds |

## 🔑 Key Features Ready to Use

### Authentication
- Email-based login
- JWT token management
- Protected routes
- Role-based access control

### Core Modules
- Horse management
- Employee management
- Task assignment and tracking
- Approval workflow
- Reporting system
- Health records
- Notifications
- Audit logging

### UI Components
- Responsive navigation
- Task cards
- Image upload widget
- Dashboard layouts
- Form pages

## 📚 Documentation Quick Links

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Complete project overview |
| [API.md](API.md) | API endpoint documentation |
| [SETUP.md](SETUP.md) | Detailed setup guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design & architecture |
| [CONFIG.md](CONFIG.md) | Configuration options |
| [ROADMAP.md](ROADMAP.md) | Future development plans |

## 🛠️ Development Commands

### Backend
```bash
npm run dev      # Start with hot reload
npm start        # Start production server
npm test         # Run tests
```

### Frontend
```bash
npm start        # Start development server
npm build        # Build for production
npm test         # Run tests
npm eject        # Eject from create-react-app (irreversible!)
```

## 🔍 Common URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| API Base | http://localhost:5000/api |
| Database | localhost:3306 |

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process using port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
```

### Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📊 Project Structure
```
horsestable/
├── backend/               # Express.js API server
│   └── src/
│       ├── routes/       # API endpoints (10 files)
│       ├── models/       # Database models (9 files)
│       ├── middleware/   # Auth & validation
│       ├── utils/        # Helper functions
│       └── config/       # Database config
│
├── frontend/              # React application
│   └── src/
│       ├── pages/        # Page components (11 files)
│       ├── components/   # UI components (7 files)
│       ├── services/     # API services (8 files)
│       ├── context/      # State management
│       └── styles/       # CSS (18 files)
│
└── database/
    ├── schema.sql        # Database schema
    └── seed.sql          # Initial data
```

## ✅ Pre-Launch Checklist

- [ ] Install Node.js and npm
- [ ] Install MySQL and create database
- [ ] Install backend dependencies
- [ ] Install frontend dependencies
- [ ] Create `.env` files with credentials
- [ ] Import database schema
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Access http://localhost:3000
- [ ] Test login flow

## 💡 Pro Tips

1. **Use VS Code** - Recommended editor with great React support
2. **Install ES7+ snippets** - For faster coding
3. **Use REST Client** - For testing API endpoints
4. **Enable hot reload** - Already configured with `npm run dev`
5. **Check logs** - Always check browser console and server logs for errors

## 🆘 Need Help?

1. Check the relevant documentation file
2. Review error messages carefully
3. Check browser console (F12)
4. Check server console output
5. Refer to SETUP.md for detailed troubleshooting

## 📞 Next Steps

After getting the app running:

1. **Review the code** - Understand the structure
2. **Implement features** - Add business logic in controllers
3. **Write tests** - Add unit and integration tests
4. **Deploy** - Follow AWS deployment guide in CONFIG.md
5. **Monitor** - Set up logging and monitoring

---

**Happy coding!** 🎉

For detailed setup instructions, see [SETUP.md](SETUP.md)
