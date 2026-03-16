# NyumbaOPs - Project Commands Reference

This document contains all the essential commands needed to work with the NyumbaOPs project.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Commands](#development-commands)
- [Build Commands](#build-commands)
- [Testing Commands](#testing-commands)
- [Database Commands](#database-commands)
- [Firebase Commands](#firebase-commands)
- [Deployment Commands](#deployment-commands)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v18 or v20 (Firebase Functions requires Node 18)
- **pnpm**: `npm install -g pnpm`
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**: For version control

---

## Initial Setup

### 1. Clone and Install Dependencies

```powershell
# Clone the repository (if not already done)
git clone <repository-url>
cd NyumbaOPs

# Install root dependencies
npm install

# Install dashboard dependencies
cd apps/dashboard
pnpm install
cd ../..

# Install public site dependencies
cd apps/public
pnpm install
cd ../..

# Install API dependencies
cd apps/api
pnpm install
cd ../..

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

---

## Development Commands

### Dashboard (Admin Frontend)

```powershell
# Navigate to dashboard
cd apps/dashboard

# Install dependencies (if not already done)
pnpm install

# Start development server (default: http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### Public Site (User Frontend)

```powershell
# Navigate to public site
cd apps/public

# Install dependencies (if not already done)
pnpm install

# Start development server (default: http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### API (NestJS Backend)

```powershell
# Navigate to API
cd apps/api

# Install dependencies (if not already done)
pnpm install

# Start development server with watch mode
pnpm start:dev

# Start development server with debug mode
pnpm start:debug

# Build for production
pnpm build

# Start production server
pnpm start:prod

# Format code
pnpm format

# Run linter
pnpm lint
```

### Firebase Functions

```powershell
# Navigate to functions
cd functions

# Install dependencies (if not already done)
npm install

# Build TypeScript
npm run build

# Start Firebase emulators (functions, firestore, auth)
npm run serve

# Run seed script
npm run seed

# Run linter
npm run lint
```

---

## Build Commands

### Build All Applications

```powershell
# Dashboard
cd apps/dashboard
pnpm build

# Public Site
cd apps/public
pnpm build

# API
cd apps/api
pnpm build

# Functions
cd functions
npm run build
```

---

## Testing Commands

### API Tests

```powershell
cd apps/api

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run end-to-end tests
pnpm test:e2e

# Run tests in debug mode
pnpm test:debug
```

### Functions Tests

```powershell
cd functions

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## Database Commands

### Prisma (API Database)

```powershell
cd apps/api

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed the database
pnpm prisma:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Firebase Commands

### Firebase Emulators (PowerShell Scripts)

The project includes PowerShell scripts for managing Firebase emulators with data persistence:

```powershell
# Start emulators with auto-import/export of data
.\start-emulators.ps1

# Seed emulators with initial data (run AFTER starting emulators)
.\seed-emulators.ps1

# Setup admin user (run AFTER creating user in Auth emulator)
.\setup-admin.ps1 -Uid "user-uid-here" -Email "admin@example.com" -Name "Admin User"

# Export current emulator data (while emulators are running)
.\export-emulator-data.ps1

# Clear all emulator data and start fresh
.\clear-emulator-data.ps1
```

**What these scripts do:**

- **start-emulators.ps1**: 
  - Sets up Java environment
  - Starts Firebase emulators (Firestore, Auth, Functions, Storage)
  - Automatically imports data from `./emulator-data` if it exists
  - Exports data on exit to preserve state between sessions

- **seed-emulators.ps1**: 
  - Seeds Firestore with initial categories and test data
  - Must be run while emulators are running

- **setup-admin.ps1**: 
  - Creates admin user role in Firestore
  - Requires user UID from Auth emulator
  - Sets user role to OWNER

- **export-emulator-data.ps1**: 
  - Manually exports current emulator state
  - Useful for creating backups

- **clear-emulator-data.ps1**: 
  - Deletes all saved emulator data
  - Requires confirmation before deleting

### Firebase Emulators (Manual Commands)

```powershell
# Start all emulators (from functions directory)
cd functions
npm run serve

# Or start specific emulators
firebase emulators:start --only functions
firebase emulators:start --only firestore
firebase emulators:start --only auth
firebase emulators:start --only functions,firestore,auth

# Start with data import/export
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

### Firebase Authentication

```powershell
# Login to Firebase
firebase login

# List Firebase projects
firebase projects:list

# Select/use a project
firebase use <project-id>
```

---

## Deployment Commands

### Deploy Dashboard

```powershell
cd apps/dashboard
pnpm build
# Deploy to your hosting provider (Vercel, Netlify, etc.)
```

### Deploy Public Site

```powershell
cd apps/public
pnpm build
# Deploy to your hosting provider (Vercel, Netlify, etc.)
```

### Deploy API

```powershell
cd apps/api
pnpm build
pnpm start:prod
# Deploy to your server/cloud provider
```

### Deploy Firebase Functions

```powershell
cd functions

# Build first
npm run build

# Deploy all functions
npm run deploy

# Or deploy specific function
firebase deploy --only functions:functionName

# Deploy with specific project
firebase deploy --only functions --project <project-id>
```

---

## Running Multiple Services Simultaneously

### Option 1: Multiple Terminal Windows

Open separate terminal windows for each service:

**Terminal 1 - Dashboard:**
```powershell
cd apps/dashboard
pnpm dev
```

**Terminal 2 - Public Site:**
```powershell
cd apps/public
pnpm dev
```

**Terminal 3 - API:**
```powershell
cd apps/api
pnpm start:dev
```

**Terminal 4 - Firebase Emulators:**
```powershell
cd functions
npm run serve
```

### Option 2: Using PowerShell Jobs (Background)

```powershell
# Start services in background
Start-Job -ScriptBlock { cd apps/dashboard; pnpm dev }
Start-Job -ScriptBlock { cd apps/public; pnpm dev }
Start-Job -ScriptBlock { cd apps/api; pnpm start:dev }
Start-Job -ScriptBlock { cd functions; npm run serve }

# View running jobs
Get-Job

# Stop all jobs
Get-Job | Stop-Job
```

---

## Troubleshooting

### Clear Node Modules and Reinstall

```powershell
# Dashboard
cd apps/dashboard
Remove-Item -Recurse -Force node_modules
pnpm install

# Public
cd apps/public
Remove-Item -Recurse -Force node_modules
pnpm install

# API
cd apps/api
Remove-Item -Recurse -Force node_modules
pnpm install

# Functions
cd functions
Remove-Item -Recurse -Force node_modules
npm install
```

### TypeScript Build Errors

```powershell
# Dashboard/Public
cd apps/dashboard  # or apps/public
pnpm exec tsc --noEmit

# API
cd apps/api
pnpm build

# Functions
cd functions
npm run build
```

### Port Already in Use

```powershell
# Find process using port 3000 (or any port)
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <process-id> /F
```

### Firebase Emulator Issues

```powershell
# Clear emulator data
firebase emulators:start --import=./emulator-data --export-on-exit

# Or manually clear
Remove-Item -Recurse -Force .firebase
```

### Prisma Client Issues

```powershell
cd apps/api

# Regenerate Prisma client
pnpm prisma:generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Environment Variables

Make sure to set up the following environment files:

- `apps/dashboard/.env.local` - Dashboard environment variables
- `apps/public/.env.local` - Public site environment variables
- `apps/api/.env` - API environment variables
- `functions/.env` - Firebase Functions environment variables (for local development)

---

## Quick Start (Development)

```powershell
# 1. Install all dependencies
cd apps/dashboard && pnpm install && cd ../..
cd apps/public && pnpm install && cd ../..
cd apps/api && pnpm install && cd ../..
cd functions && npm install && cd ..

# 2. Start Firebase emulators (Terminal 1)
cd functions
npm run serve

# 3. Start API (Terminal 2)
cd apps/api
pnpm start:dev

# 4. Start Dashboard (Terminal 3)
cd apps/dashboard
pnpm dev

# 5. Start Public Site (Terminal 4)
cd apps/public
pnpm dev
```

---

## Default Ports

- **Dashboard**: http://localhost:3000
- **Public Site**: http://localhost:3001 (if dashboard is on 3000)
- **API**: http://localhost:3001 (check API configuration)
- **Firebase Emulator UI**: http://localhost:4000
- **Firestore Emulator**: http://localhost:8080
- **Auth Emulator**: http://localhost:9099
- **Functions Emulator**: http://localhost:5001

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [pnpm Documentation](https://pnpm.io)

---

**Last Updated**: February 2026
