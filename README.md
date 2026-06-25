# Bansal Family Tree

A modern, secure, responsive family tree web application built with **React 19**, **TypeScript**, **Firebase**, and **Tailwind CSS**.

Migrated from the legacy Google Sheets + GitHub Pages version to a fully serverless Firebase architecture.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite** — Build tool
- **Tailwind CSS v4** — Styling
- **Firebase Hosting** — Hosting
- **Firebase Authentication** — Auth (Google Sign-In + Email/Password)
- **Cloud Firestore** — Database
- **Firebase Storage** — Photo storage

## Features

- Interactive family tree with zoom, pan, and expand/collapse
- Dark/light mode with smooth transitions
- Instant search (name, phone, email, occupation)
- Profile pages with photos, relationships, and gallery
- Relationship path finder
- Admin dashboard for CRUD operations
- Image upload with compression and progress
- Responsive design (mobile + desktop)
- Firebase authentication (Google + Email/Password)
- Role-based access control (Admin / Family Member)
- Proper security rules for Firestore and Storage
- Lazy loading images and pagination

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   ├── ThemeToggle.tsx
│   ├── SearchBar.tsx
│   ├── MemberCard.tsx
│   └── ImageUpload.tsx
├── context/          # React context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── ToastContext.tsx
├── firebase/         # Firebase configuration and services
│   ├── config.ts
│   ├── auth.ts
│   ├── firestore.ts
│   └── storage.ts
├── hooks/            # Custom React hooks
│   └── useMembers.ts
├── pages/            # Route pages
│   ├── Login.tsx
│   ├── Tree.tsx
│   ├── Profile.tsx
│   └── Dashboard.tsx
├── services/         # Business logic
│   └── validation.ts
├── types/            # TypeScript interfaces
│   └── index.ts
├── utils/            # Helper functions
│   ├── constants.ts
│   └── helpers.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Authentication**:
   - Google Sign-In provider
   - Email/Password provider
4. Create **Cloud Firestore** database (start in test mode, update rules later)
5. Create **Firebase Storage** bucket
6. Set up **Firebase Hosting**

### 2. Get Firebase Config

In Firebase Console → Project Settings → General → Your apps → Web app, copy the config object.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Deploy Security Rules

Open `firestore.rules` and `storage.rules` and update the `YOUR_PROJECT_ID` placeholder with your actual Firestore project ID.

Then deploy:

```bash
npx firebase deploy --only firestore,storage
```

### 5. Create Admin User

1. Sign up through the app (or create user in Firebase Console → Authentication)
2. In Firebase Console → Firestore Database, create a document in `users` collection with:
   - Document ID: the user's UID
   - Fields: `uid`, `email`, `displayName`, `role: "admin"`, `approved: true`

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Firebase config

# Start development server
npm run dev
```

## Deployment

### Prerequisites

Install Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

### Deploy to Firebase

```bash
# Build the project
npm run build

# Deploy hosting, Firestore rules, and Storage rules
npx firebase deploy

# Or deploy individually
npx firebase deploy --only hosting
npx firebase deploy --only firestore
npx firebase deploy --only storage
```

### Set hosting as default

In `firebase.json`, hosting configuration is already set up for SPA rewrites and caching.

## Data Migration from Google Sheets

1. Export your Google Sheet as CSV
2. Write a script to transform rows into Firestore documents matching the `FamilyMember` interface
3. Use Firebase Admin SDK or the Firebase Console to import data

The old fields map as follows:

| Google Sheet   | Firestore        |
|----------------|------------------|
| ID             | id               |
| Name           | firstName+lastName |
| Gender         | gender           |
| FatherID       | fatherId         |
| MotherID       | motherId         |
| SpouseID       | spouseIds[]      |
| PhotoURL       | photo            |
| DOB            | birthDate        |
| MarriageDate   | (removed)        |
| Occupation     | occupation       |
| Education      | education        |
| City           | address          |
| Bio            | notes            |
| Email          | email            |
| Phone          | phone            |
| Generation     | (computed)       |

## Roles

### Admin
- Add, edit, delete family members
- Upload and manage photos
- Manage user approvals
- Access the admin dashboard

### Family Member
- View the family tree
- Search members
- View profiles and photos
- Read-only access

## Security

- All data access requires authentication
- Photos in Firebase Storage are not publicly accessible
- Firestore rules enforce role-based access
- Family members have read-only access
- Only admins can create, update, or delete data

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## License

MIT
