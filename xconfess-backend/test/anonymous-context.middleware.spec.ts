import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AnonymousContextMiddleware } from '../src/middleware/anonymous-context.middleware';
import { AnonymousContextModule } from '../src/middleware/anonymous-context.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { User } from '../src/user/entities/user.entity';

describe('AnonymousContextMiddleware (e2e)', () => {
  let app: INestApplication;
  let middleware: AnonymousContextMiddleware;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    emailEncrypted: 'enc',
    emailIv: 'iv',
    emailTag: 'tag',
    emailHash: 'hash',
    password: 'hashedpassword',
    isAdmin: false,
    is_active: true,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnonymousContextModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    middleware = moduleFixture.get<AnonymousContextMiddleware>(AnonymousContextMiddleware);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should add anonymous context header for authenticated requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/test')
      .set('Authorization', 'Bearer test-token');

    expect(response.headers['x-anonymous-context-id']).toBeDefined();
    expect(response.headers['x-anonymous-context-id']).toMatch(/^anon_[a-f0-9-]+$/);
  });

  it('should generate unique anonymous context IDs for different requests', async () => {
    const response1 = await request(app.getHttpServer())
      .get('/test')
      .set('Authorization', 'Bearer test-token');

    const response2 = await request(app.getHttpServer())
      .get('/test')
      .set('Authorization', 'Bearer test-token');

    expect(response1.headers['x-anonymous-context-id']).not.toBe(
      response2.headers['x-anonymous-context-id'],
    );
  });

  it('should not add anonymous context header for unauthenticated requests', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnonymousContextModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => false,
      })
      .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer()).get('/test');

    expect(response.headers['x-anonymous-context-id']).toBeUndefined();
    await app.close();
  });
}); 