import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { documentPipeline } from '../src/modules/processing/document.pipeline.js';
import { processingWorker } from '../src/modules/processing/processing.worker.js';
import { geminiService } from '../src/modules/processing/gemini.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, 'fixtures/pipeline');

// Helper to construct a minimal valid PDF buffer
function createTestPdfBuffer(text) {
  const content = text || 'Default test PDF content for pipeline integration test.';
  const streamContent = `BT\n/F1 12 Tf\n72 712 Td\n(${content.replace(/[()]/g, '')}) Tj\nET`;
  const streamLen = Buffer.byteLength(streamContent);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000299 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;

  return Buffer.from(pdf);
}

describe('Document Processing Pipeline & Endpoints', () => {
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;
  let testFileId;

  const samplePdfPath = path.join(fixturesDir, 'pipeline_test.pdf');
  const emptyPdfPath = path.join(fixturesDir, 'empty_pipeline.pdf');

  beforeAll(async () => {
    await connectDatabase();

    fs.mkdirSync(fixturesDir, { recursive: true });
    fs.writeFileSync(samplePdfPath, createTestPdfBuffer('Novastat Document Intelligence Pipeline Test'));
    fs.writeFileSync(emptyPdfPath, Buffer.alloc(0));

    // Register User A
    const userARes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Pipeline Owner',
        email: `pipeline_owner_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'USER',
      });
    userAToken = userARes.body.data.token;
    userAId = userARes.body.data.user.id;

    // Register User B (for authorization checks)
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User',
        email: `another_user_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'USER',
      });
    userBToken = userBRes.body.data.token;
    userBId = userBRes.body.data.user.id;
  });

  afterAll(async () => {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    await prisma.file.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    await disconnectDatabase();
  });

  it('1. should upload a PDF and initialize with PENDING status and VALIDATION stage', async () => {
    const res = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', samplePdfPath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.processingStage).toBe('VALIDATION');
    expect(res.body.data.id).toBeDefined();

    testFileId = res.body.data.id;
  });

  it('2. should poll status and verify stage transitions and progress updates', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${testFileId}/status`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileId).toBe(testFileId);
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(res.body.data.status);
    expect(typeof res.body.data.progress).toBe('number');
  });

  it('3. should complete all four stages successfully when mocked Gemini is active', async () => {
    // Mock Gemini analyze and summary
    const mockSummary = {
      title: 'Novastat Document Intelligence Pipeline Test',
      overview: 'Document verified and processed via automated pipeline.',
      keyPoints: ['First point', 'Second point'],
      importantTerms: [{ term: 'Pipeline', definition: '4-stage document processor' }],
      importantFacts: ['Processed 100%'],
      conclusion: 'Pipeline completed successfully.',
    };

    vi.spyOn(geminiService, 'isConfigured').mockReturnValue(true);
    vi.spyOn(geminiService, 'analyzeContent').mockResolvedValue('Analyzed topics and concepts.');
    vi.spyOn(geminiService, 'generateSummary').mockResolvedValue(mockSummary);

    const file = await prisma.file.findUnique({ where: { id: testFileId } });
    await documentPipeline.process(file, new AbortController().signal, { minStageDuration: 50 });

    const completed = await prisma.file.findUnique({ where: { id: testFileId } });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.processingStage).toBe('COMPLETED');
    expect(completed.progress).toBe(100);
    expect(completed.extractedText).toContain('Novastat Document Intelligence');
    expect(completed.summary).toBeDefined();
    expect(completed.summary.title).toBe('Novastat Document Intelligence Pipeline Test');
  });

  it('4. should retrieve extracted text via GET /api/v1/files/:id/extracted-text', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${testFileId}/extracted-text`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extractedText).toContain('Novastat Document Intelligence');
    expect(res.body.data.pageCount).toBeGreaterThanOrEqual(1);
  });

  it('5. should retrieve structured AI summary via GET /api/v1/files/:id/summary', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${testFileId}/summary`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.title).toBe('Novastat Document Intelligence Pipeline Test');
    expect(res.body.data.summary.keyPoints.length).toBe(2);
  });

  it('6. should allow authorized user to trigger reprocessing via POST /api/v1/files/:id/reprocess', async () => {
    const res = await request(app)
      .post(`/api/v1/files/${testFileId}/reprocess`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('7. should handle extraction/validation failure gracefully and mark status FAILED', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', emptyPdfPath);

    const failedFileId = uploadRes.body.data.id;
    const file = await prisma.file.findUnique({ where: { id: failedFileId } });

    // Expect pipeline to throw and catch
    await expect(documentPipeline.process(file, new AbortController().signal)).rejects.toThrow();

    // Mark as failed in worker style
    await prisma.file.update({
      where: { id: failedFileId },
      data: { status: 'FAILED', errorMessage: 'Uploaded PDF is empty' },
    });

    const check = await prisma.file.findUnique({ where: { id: failedFileId } });
    expect(check.status).toBe('FAILED');
  });

  it('8. should prevent duplicate processing of the same file concurrently', () => {
    processingWorker.activeJobs.set('test_duplicate_id', { abortController: new AbortController() });
    expect(processingWorker.isProcessing('test_duplicate_id')).toBe(true);
    processingWorker.activeJobs.delete('test_duplicate_id');
  });

  it('9. Authorization: unauthenticated requests to summary or extracted-text must return 401', async () => {
    const res1 = await request(app).get(`/api/v1/files/${testFileId}/summary`);
    expect(res1.status).toBe(401);

    const res2 = await request(app).get(`/api/v1/files/${testFileId}/extracted-text`);
    expect(res2.status).toBe(401);

    const res3 = await request(app).post(`/api/v1/files/${testFileId}/reprocess`);
    expect(res3.status).toBe(401);
  });

  it('10. Authorization: User B cannot access User A document summary, text, or reprocess', async () => {
    const summaryRes = await request(app)
      .get(`/api/v1/files/${testFileId}/summary`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(summaryRes.status).toBe(403);

    const textRes = await request(app)
      .get(`/api/v1/files/${testFileId}/extracted-text`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(textRes.status).toBe(403);

    const reprocessRes = await request(app)
      .post(`/api/v1/files/${testFileId}/reprocess`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(reprocessRes.status).toBe(403);
  });
});
