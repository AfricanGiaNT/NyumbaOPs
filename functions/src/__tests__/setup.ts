import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

let testEnv: any;

beforeAll(async () => {
  // Set up test environment with Firebase emulator
  testEnv = await initializeTestEnvironment({
    projectId: 'nyumbaops-test',
    firestore: {
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});
