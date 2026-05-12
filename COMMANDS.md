# NyumbaOps — Common Commands

## Quick Start (full local stack)

Open three terminal windows:

```powershell
# Terminal 1 — Firebase emulators (keep running)
.\start-emulators.ps1

# Terminal 2 — Dashboard  http://localhost:3000
pnpm -C apps/dashboard dev

# Terminal 3 — Public site  http://localhost:3001  (optional)
pnpm -C apps/public dev -p 3001
```

---

## Install Dependencies

```powershell
pnpm install                      # root
pnpm -C functions install
pnpm -C apps/dashboard install
pnpm -C apps/public install
```

---

## Emulator Scripts

```powershell
.\start-emulators.ps1             # start emulators (auto-imports saved data)
.\seed-emulators.ps1              # seed Firestore with test data
.\setup-admin.ps1 -Uid "UID" -Email "owner@test.com" -Name "Test Owner"
.\export-emulator-data.ps1        # manual data export while running
.\clear-emulator-data.ps1         # wipe emulator data for a fresh start
```

---

## Build & Deploy

```powershell
pnpm -C apps/dashboard build      # build dashboard
pnpm -C apps/public build         # build public site

firebase deploy                   # deploy everything to production
firebase deploy --only functions
firebase deploy --only firestore:indexes
firebase deploy --only hosting
```

---

## Testing

```powershell
# Unit & integration (emulators must be running)
pnpm -C functions test
pnpm -C functions test:watch
pnpm -C functions test:coverage

# E2E (emulators + apps must be running)
npx playwright test
npx playwright test --project=chromium
npx playwright test --headed
npx playwright test e2e/public-inquiry.spec.ts
```

---

## Firebase CLI

```powershell
firebase login
firebase projects:list
firebase use <project-id>
firebase emulators:start --debug   # verbose mode if emulators won't start
firebase functions:log             # live function logs
```

---

## Local URLs

| Service        | URL                                             |
|----------------|-------------------------------------------------|
| Dashboard      | http://localhost:3000                           |
| Public site    | http://localhost:3001                           |
| Emulator UI    | http://localhost:4000                           |
| Firestore      | http://localhost:4000/firestore                 |
| Auth           | http://localhost:9099/auth                      |
| Functions API  | http://localhost:5001/nyumbaops/us-central1/api |

---

## Troubleshooting

```powershell
# Java not found (emulators need Java 21+)
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"
$env:Path += ";C:\Program Files\Java\jdk-21.0.10\bin"

# Port already in use
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# TypeScript errors in dashboard
pnpm -C apps/dashboard exec tsc --noEmit

# Nuke and reinstall node_modules
Remove-Item -Recurse -Force apps/dashboard/node_modules
pnpm -C apps/dashboard install
```
