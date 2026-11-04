import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Clean up test users
    await prisma.file.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { in: ['testauth@example.com', 'testauth2@example.com'] } },
    });
  });

  afterAll(async () => {
    await prisma.file.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { in: ['testauth@example.com', 'testauth2@example.com'] } },
    });
    await disconnectDatabase();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Auth User',
        email: 'testauth@example.com',
        password: 'Password123!',
        role: 'USER',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('testauth@example.com');
    expect(res.body.data.user.password).toBeUndefined(); // Never expose password
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'testauth@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should log in an existing user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testauth@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('testauth@example.com');
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testauth@example.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return profile for authenticated user via /me', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testauth@example.com',
        password: 'Password123!',
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('testauth@example.com');
    expect(meRes.body.data.password).toBeUndefined();
  });

  it('should reject unauthenticated request to /me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

