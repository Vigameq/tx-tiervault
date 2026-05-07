# TierVault

Enterprise-grade multi-tenant document management system with version control.

## Overview

TierVault is a SaaS-based document management system designed for enterprise use, featuring intelligent version control, multi-tenant architecture, and comprehensive document lifecycle management.

## Features

- **Multi-Tenant Architecture**: Secure tenant isolation with dedicated data segregation
- **Intelligent Version Control**: Automatic version detection and smart file comparison
- **Document Management**: Support for PDF, Excel, Word, and all file types
- **Role-Based Access Control**: Granular permissions (Admin, Manager, Editor, Viewer)
- **Audit Logging**: Complete activity tracking and compliance reporting
- **Document Workflow**: Approval workflows and lifecycle management
- **Real-time Collaboration**: Comments, annotations, and activity feeds
- **Enterprise Security**: Encryption at rest and in transit

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Firebase SDK
- React Query

### Backend
- Firebase Functions (Node.js + TypeScript)
- Firebase Authentication
- Firestore Database
- Digital Ocean Spaces (S3-compatible storage)

### Infrastructure
- Firebase Hosting
- Serverless architecture
- Auto-scaling

## Project Structure

```
tx-TierVault/
├── frontend/           # React application
├── functions/          # Firebase Cloud Functions
├── firebase.json       # Firebase configuration
├── firestore.rules     # Database security rules
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Digital Ocean account (for Spaces)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Vigameq/tx-TierVault.git
cd tx-TierVault
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install functions dependencies
```bash
cd ../functions
npm install
```

4. Setup environment variables
```bash
cp .env.example .env
# Edit .env with your Firebase and Digital Ocean credentials
```

5. Initialize Firebase
```bash
firebase login
firebase init
```

### Development

1. Start frontend development server
```bash
cd frontend
npm run dev
```

2. Start Firebase emulators
```bash
firebase emulators:start
```

### Deployment

```bash
# Deploy functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# Deploy all
firebase deploy
```

## Environment Variables

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=
DO_SPACES_REGION=
DO_SPACES_BUCKET=
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Best Practices](docs/SECURITY.md)

## License

Proprietary - All rights reserved

## Support

For support, email support@tiervault.com
