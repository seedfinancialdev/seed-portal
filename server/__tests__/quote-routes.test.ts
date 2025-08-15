import express from 'express';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';

import { jest } from '@jest/globals';

// ESM-compatible module mocks require unstable_mockModule before importing the module under test
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

// Compute absolute module paths to align with how ESM resolves './x' inside quote-routes.ts
const authPath = path.join(serverDir, 'auth.ts');
const storagePath = path.join(serverDir, 'storage.ts');
const boxIntegrationPath = path.join(serverDir, 'box-integration.ts');
const msaGeneratorPath = path.join(serverDir, 'msa-generator.ts');
const loggerPath = path.join(serverDir, 'logger.ts');

// Prepare mutable mocks so tests can configure behavior per-test
const requireAuthMock = jest.fn((_req: any, _res: any, next: any) => next());
const storageMock = {
  getQuote: jest.fn(),
  updateQuote: jest.fn(),
};
const boxServiceMock = {
  createClientFolder: jest.fn(),
  uploadMSA: jest.fn(),
  uploadSOWDocuments: jest.fn(),
};
const msaGeneratorMock = {
  generateMSA: jest.fn(),
};
const loggerMock = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  }
};

// Register ESM mocks
jest.unstable_mockModule(authPath, () => ({ requireAuth: requireAuthMock }));
jest.unstable_mockModule(storagePath, () => ({ storage: storageMock }));
jest.unstable_mockModule(boxIntegrationPath, () => ({ boxService: boxServiceMock }));
jest.unstable_mockModule(msaGeneratorPath, () => ({ msaGenerator: msaGeneratorMock }));
jest.unstable_mockModule(loggerPath, () => (loggerMock));

// Now import the router under test (after mocks have been set up)
const { default: quoteRouter } = await import(path.join(serverDir, 'quote-routes.ts'));

function buildApp() {
  const app = express();
  app.use(express.json());
  // Mount router at /api to mirror production structure
  app.use('/api', quoteRouter);
  return app;
}

describe('POST /quotes/:id/generate-documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOX_TEMPLATE_FOLDER_ID = process.env.BOX_TEMPLATE_FOLDER_ID || 'TEMPLATE_FOLDER_ID_TEST';
  });

  it('returns 404 when quote is not found', async () => {
    storageMock.getQuote.mockResolvedValueOnce(null);

    const app = buildApp();
    const res = await request(app).post('/api/quotes/123/generate-documents');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Quote not found' });
    expect(storageMock.getQuote).toHaveBeenCalledWith(123);
  });

  it('generates MSA and uploads SOWs, then updates quote and returns details', async () => {
    const quote = {
      id: 123,
      companyName: 'Acme Inc',
      contactEmail: 'client@example.com',
      entityType: 'LLC',
      clientStreetAddress: '123 Main St',
      clientCity: 'San Francisco',
      clientState: 'CA',
      clientZipCode: '94105',
      clientCountry: 'USA',
      industry: 'Tech',
      monthlyFee: 5000,
      setupFee: 1000,
      serviceBookkeeping: true,
      serviceTaas: false,
      servicePayroll: true,
      serviceApArLite: false,
      serviceFpaLite: true,
      boxFolderUrl: null,
      msaFileUrl: null,
    } as any;

    storageMock.getQuote.mockResolvedValueOnce(quote);

    boxServiceMock.createClientFolder.mockResolvedValueOnce({
      folderId: 'folder123',
      webUrl: 'https://box.com/folder/folder123',
    });

    msaGeneratorMock.generateMSA.mockResolvedValueOnce(Buffer.from('docx-binary'));

    boxServiceMock.uploadMSA.mockResolvedValueOnce({
      fileId: 'file123',
      webUrl: 'https://box.com/file/file123',
    });

    boxServiceMock.uploadSOWDocuments.mockResolvedValueOnce([
      { service: 'bookkeeping', fileId: 'sow1' },
      { service: 'payroll', fileId: 'sow2' },
      { service: 'fpa_lite', fileId: 'sow3' },
    ]);

    const app = buildApp();
    const res = await request(app).post('/api/quotes/123/generate-documents');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.boxFolder).toEqual({ folderId: 'folder123', webUrl: 'https://box.com/folder/folder123' });
    expect(res.body.msaDocument).toEqual({ fileId: 'file123', webUrl: 'https://box.com/file/file123' });
    expect(res.body.sowDocuments).toHaveLength(3);
    // 3 selected services (bookkeeping, payroll, fpa_lite) + 1 MSA
    expect(res.body.documentsGenerated).toBe(4);

    // Validate update persisted
    expect(storageMock.updateQuote).toHaveBeenCalledWith({
      id: 123,
      boxFolderId: 'folder123',
      boxFolderUrl: 'https://box.com/folder/folder123',
      msaFileId: 'file123',
      msaFileUrl: 'https://box.com/file/file123',
    });
  });

  it('returns 500 on unexpected errors', async () => {
    const quote = { id: 333, companyName: 'ErrCo', contactEmail: 'err@example.com' } as any;
    storageMock.getQuote.mockResolvedValueOnce(quote);
    msaGeneratorMock.generateMSA.mockRejectedValueOnce(new Error('generation failed'));

    const app = buildApp();
    const res = await request(app).post('/api/quotes/333/generate-documents');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to generate documents');
    expect(res.body.message).toBe('generation failed');
  });
});
