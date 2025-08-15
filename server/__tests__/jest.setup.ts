// Jest setup for ESM + ts-jest
import { jest } from '@jest/globals';

// Ensure expected env variables exist for tests
process.env.BOX_TEMPLATE_FOLDER_ID = process.env.BOX_TEMPLATE_FOLDER_ID || 'TEMPLATE_FOLDER_ID_TEST';

// Provide a minimal global fetch stub if not present (Node < 18 or jest env differences)
if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ([]),
  }));
}
