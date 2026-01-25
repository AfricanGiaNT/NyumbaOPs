"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
let testEnv;
beforeAll(async () => {
    // Set up test environment with Firebase emulator
    testEnv = await (0, rules_unit_testing_1.initializeTestEnvironment)({
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
