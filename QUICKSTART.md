# TierVault Quick Start Guide

Get TierVault running locally in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- Firebase account
- Digital Ocean account

## Quick Setup (5 Steps)

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Functions
cd ../functions
npm install
```

### 2. Configure Firebase

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select existing project or create new)
firebase init
```

### 3. Set Environment Variables

```bash
# Copy example
cp .env.example .env

# Edit .env with your credentials
# Get Firebase config from: https://console.firebase.google.com
# Get DO Spaces keys from: https://cloud.digitalocean.com/spaces
nano .env
```

### 4. Create Initial Data

**Option A: Using Firebase Console**
1. Go to Firestore Database
2. Create `tenants` collection with one document
3. Create `users` collection with admin user

**Option B: Using Emulator (easier for testing)**
```bash
firebase emulators:start
```

### 5. Start Development

**Terminal 1 - Backend:**
```bash
cd functions
npm run serve
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

## Test Login

Default credentials (if using emulator with seed data):
- Email: `admin@demo.com`
- Password: `Admin123!`

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed setup
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Start building features!

## Common Issues

### Port already in use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Firebase not initialized
```bash
firebase init
# Select: Firestore, Functions, Hosting
```

### Environment variables not loaded
```bash
# Make sure .env exists in project root
cat .env
```

## Project Structure

```
tx-TierVault/
├── frontend/          # React app
├── functions/         # Firebase Functions (API)
├── firebase.json      # Firebase config
├── firestore.rules    # Security rules
└── .env              # Environment variables
```

## Useful Commands

```bash
# Deploy to production
firebase deploy

# View logs
firebase functions:log

# Build frontend
cd frontend && npm run build

# Build functions
cd functions && npm run build

# Run emulators
firebase emulators:start
```

## Documentation

- [README.md](README.md) - Project overview
- [SETUP.md](SETUP.md) - Detailed setup guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [API.md](API.md) - API documentation

## Support

Need help? Check:
1. Firebase Console logs
2. Browser console (F12)
3. Terminal errors
4. Documentation

Happy coding! 🚀
