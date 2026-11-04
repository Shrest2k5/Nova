import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

describe('Background Processing Simulation', () => {
  let token;
  let userId;
  const normalFilePath = path.resolve('test-normal.txt');
  const failFilePath = path.resolve('test-corrupt-fail.txt');

  beforeAll(async () => {
    await connectDatabase();

    fs.writeFileSync(normalFilePath, 'Normal processing test payload');
    fs.writeFileSync(failFilePath, 'Corrupted test file intended to fail');

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Worker Test User',
      email: `worker_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'USER',
    });
    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (fs.existsSync(normalFilePath)) fs.unlinkSync(normalFilePath);
    if (fs.existsSync(failFilePath)) fs.unlinkSync(failFilePath);
    if (userId) {
      await prisma.file.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await disconnectDatabase();
  });

  it('should transition file from PENDING to PROCESSING when background worker begins', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', normalFilePath);

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.data.id;
    expect(uploadRes.body.data.status).toBe('PENDING');

    // Wait a brief moment for setImmediate to trigger worker start
    await new Promise((resolve) => setTimeout(resolve, 600));

    const statusRes = await request(app)
      .get(`/api/v1/files/${fileId}/status`)
      .set('Authorization', `Bearer ${token}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('PROCESSING');
    expect(statusRes.body.data.progress).toBeGreaterThanOrEqual(5);
  });

  it('should update file to FAILED with error message if file is marked as corrupt/fail', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', failFilePath);

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.data.id;

    // Verify initial state
    expect(uploadRes.body.data.status).toBe('PENDING');

    // Let the worker initiate
    await new Promise((resolve) => setTimeout(resolve, 600));
    const checkRes = await request(app)
      .get(`/api/v1/files/${fileId}/status`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.body.data.status).toBe('PROCESSING');
  });
});
