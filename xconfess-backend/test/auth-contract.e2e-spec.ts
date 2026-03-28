import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Auth Contract (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = app.get(getRepositoryToken(User));
  });

  beforeEach(async () => {
    // Clean up test data
    await userRepository.delete({});

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    testUser = await userRepository.save({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      is_active: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return access_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.username).toBe('testuser');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password',
        })
        .expect(401);
    });

    it('should reject inactive user', async () => {
      await userRepository.update(testUser.id, { is_active: false });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        });

      accessToken = loginResponse.body.access_token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('is_active', true);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        });

      accessToken = loginResponse.body.access_token;
    });

    it('should logout with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Logged out successfully',
      );
    });

    it('should reject logout without token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  describe('Auth Contract Consistency', () => {
    it('should use consistent token field name across endpoints', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        });

      // Verify token field name is 'access_token'
      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).not.toHaveProperty('token');

      // Use the same token for subsequent requests
      const token = loginResponse.body.access_token;

      // Verify /auth/me works with the same token
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify /auth/logout works with the same token
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should have consistent user profile structure', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword',
        });

      const loginUserData = loginResponse.body.user;

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(200);

      const profileUserData = profileResponse.body;

      // Both should have the same structure
      expect(loginUserData).toHaveProperty('id');
      expect(loginUserData).toHaveProperty('username');
      expect(loginUserData).toHaveProperty('email');
      expect(loginUserData).toHaveProperty('is_active');

      expect(profileUserData).toHaveProperty('id');
      expect(profileUserData).toHaveProperty('username');
      expect(profileUserData).toHaveProperty('email');
      expect(profileUserData).toHaveProperty('is_active');

      // Values should match
      expect(loginUserData.id).toBe(profileUserData.id);
      expect(loginUserData.username).toBe(profileUserData.username);
      expect(loginUserData.email).toBe(profileUserData.email);
    });
  });
});
