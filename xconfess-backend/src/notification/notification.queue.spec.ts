import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { NotificationQueue } from './notification.queue';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Comment } from '../comment/entities/comment.entity';
import { User } from '../user/entities/user.entity';

describe('NotificationQueue', () => {
  let service: NotificationQueue;
  let emailService: EmailService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
      const config = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockEmailService = {
    sendCommentNotification: jest.fn(),
  };

  const mockConfession: AnonymousConfession = {
    id: '123',
    message: 'Test confession',
    created_at: new Date(),
    user: {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword',
      is_active: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      confessions: [],
    },
  } as AnonymousConfession;

  const mockComment: Comment = {
    id: 1,
    content: 'Test comment',
    user: {
      id: 2,
      email: 'commenter@example.com',
      username: 'commenter',
      password: 'hashedpassword',
      is_active: true,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      confessions: [],
    },
    confession: mockConfession,
    anonymousContextId: 'anon_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueue,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<NotificationQueue>(NotificationQueue);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue a comment notification', async () => {
    const payload = {
      confession: mockConfession,
      comment: mockComment,
      recipientEmail: mockConfession.user.email,
    };

    await service.enqueueCommentNotification(payload);

    // Wait for the worker to process the job
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockEmailService.sendCommentNotification).toHaveBeenCalledWith({
      to: mockConfession.user.email,
      confessionId: mockConfession.id,
      commentPreview: expect.any(String),
    });
  });

  it('should create an anonymized preview of the comment', async () => {
    const longComment = {
      ...mockComment,
      content: 'This is a very long comment that should be truncated to create a preview. It contains more than 100 characters to test the truncation functionality.',
    };

    const payload = {
      confession: mockConfession,
      comment: longComment,
      recipientEmail: mockConfession.user.email,
    };

    await service.enqueueCommentNotification(payload);

    // Wait for the worker to process the job
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockEmailService.sendCommentNotification).toHaveBeenCalledWith({
      to: mockConfession.user.email,
      confessionId: mockConfession.id,
      commentPreview: expect.stringMatching(/^This is a very long comment.*\.\.\.$/),
    });
  });
}); 