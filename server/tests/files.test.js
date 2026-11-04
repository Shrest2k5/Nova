import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

describe('Files API Endpoints', () => {
  let tokenUserA;
  let tokenUserB;
  let userAId;
  let userBId;
  let uploadedFileId;

  const tempFilePath = path.resolve('test-sample.txt');

  beforeAll(async () => {
    await connectDatabase();
    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!',
      role: 'USER',
    });
    tokenUserA = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123!',
      role: 'USER',
    });
    tokenUserB = resB.body.data.token;
    userBId = resB.body.data.user.id;

    // Clean up any old files for these users
    await prisma.file.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });

    // Create a temporary file to upload
    fs.writeFileSync(tempFilePath, 'Sample file content for testing upload pipeline');
  });

  afterAll(async () => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (userAId && userBId) {
      await prisma.file.deleteMany({
        where: { userId: { in: [userAId, userBId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId] } },
      });
    }
    await disconnectDatabase();
  });

  it('should upload a valid file and set status to PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .attach('file', tempFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.originalName).toBe('test-sample.txt');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.progress).toBe(0);

    uploadedFileId = res.body.data.id;
  });

  it('should reject file upload with unsupported file extension', async () => {
    const invalidFilePath = path.resolve('test-invalid.exe');
    fs.writeFileSync(invalidFilePath, 'fake executable');

    try {
      const res = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', invalidFilePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid file extension');
    } finally {
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });

  it('should list files for authenticated user with pagination and search', async () => {
    const res = await request(app)
      .get('/api/v1/files?page=1&limit=10&search=sample')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('should retrieve status of an uploaded file', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${uploadedFileId}/status`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(uploadedFileId);
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(res.body.data.status);
  });

  it('should prevent User B from accessing User A file (User Isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should prevent User B from deleting User A file', async () => {
    const res = await request(app)
      .delete(`/api/v1/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.status).toBe(403);
  });

  it('should allow User A to delete their own file', async () => {
    const res = await request(app)
      .delete(`/api/v1/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is gone
    const checkRes = await request(app)
      .get(`/api/v1/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(checkRes.status).toBe(404);
  });
});
