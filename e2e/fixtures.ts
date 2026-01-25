import { test as base } from '@playwright/test';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBZzVtut0HMha1DZWBvhKNcBy_rYBKQWvs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'nyumbaops.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nyumbaops',
};

type AuthFixtures = {
  authenticatedContext: any;
  unauthenticatedContext: any;
};

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    
    // Initialize Firebase and sign in
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    try {
      await signInWithEmailAndPassword(
        auth,
        process.env.TEST_USER_EMAIL || 'owner@test.com',
        process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      );
      
      const idToken = await auth.currentUser?.getIdToken();
      
      // Add auth token to requests
      if (idToken) {
        await context.addInitScript((token) => {
          localStorage.setItem('authToken', token);
        }, idToken);
      }
    } catch (error) {
      console.warn('Failed to authenticate test user:', error);
    }
    
    await use(context);
    await context.close();
  },
  
  unauthenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
