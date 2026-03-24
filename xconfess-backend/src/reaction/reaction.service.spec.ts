import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { Reaction } from './entities/reaction.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { OutboxEvent } from '../common/entities/outbox-event.entity';
import { AnalyticsService } from '../analytics/analytics.service';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeConfession = (
  overrides: Partial<AnonymousConfession> = {},
): AnonymousConfession =>
  ({
    id: 'conf-uuid-1',
    message: 'Test confession',
    moderationStatus: 'approved',
    isDeleted: false,
    isHidden: false,
    reactions: [],
    ...overrides,
  }) as AnonymousConfession;

const makeAnonymousUser = (
  overrides: Partial<AnonymousUser> = {},
): AnonymousUser =>
  ({
    id: 'anon-uuid-1',
    ...overrides,
  }) as AnonymousUser;

const makeReaction = (overrides: Partial<Reaction> = {}): Reaction =>
  ({
    id: 'react-uuid-1',
    emoji: '❤️',
    confession: makeConfession(),
    anonymousUser: makeAnonymousUser(),
    createdAt: new Date(),
    ...overrides,
  }) as Reaction;

// ─── Repo mock factory ────────────────────────────────────────────────────────

const repoMock = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('ReactionService', () => {
  let service: ReactionService;
  let reactionRepo: ReturnType<typeof repoMock>;
  let confessionRepo: ReturnType<typeof repoMock>;
  let anonymousUserRepo: ReturnType<typeof repoMock>;
  // inner manager repo shared so transaction-based calls can be asserted
  let managerReactionRepo: ReturnType<typeof repoMock>;
  let managerOutboxRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    managerReactionRepo = repoMock();
    managerOutboxRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        { provide: getRepositoryToken(Reaction), useFactory: repoMock },
        {
          provide: getRepositoryToken(AnonymousConfession),
          useFactory: repoMock,
        },
        { provide: getRepositoryToken(AnonymousUser), useFactory: repoMock },
        { provide: getRepositoryToken(OutboxEvent), useFactory: repoMock },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb: any) =>
              cb({
                getRepository: jest.fn().mockImplementation((entity: any) => {
                  if (entity === Reaction) return managerReactionRepo;
                  return managerOutboxRepo;
                }),
              }),
            ),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            invalidateTrendingCache: jest.fn().mockResolvedValue(undefined),
            invalidateReactionDistributionCache: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ReactionService>(ReactionService);
    reactionRepo = module.get(getRepositoryToken(Reaction));
    confessionRepo = module.get(getRepositoryToken(AnonymousConfession));
    anonymousUserRepo = module.get(getRepositoryToken(AnonymousUser));
  });

  afterEach(() => jest.clearAllMocks());

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('createReaction()', () => {
    const dto = {
      confessionId: 'conf-uuid-1',
      anonymousUserId: 'anon-uuid-1',
      emoji: '❤️',
    };

    it('creates and returns a new reaction (happy path)', async () => {
      const confession = makeConfession();
      const user = makeAnonymousUser();
      const reaction = makeReaction({ confession, anonymousUser: user });

      confessionRepo.findOne.mockResolvedValue(confession);
      anonymousUserRepo.findOne.mockResolvedValue(user);
      // Duplicate check and save are inside the transaction (manager repo)
      managerReactionRepo.findOne.mockResolvedValue(null);
      managerReactionRepo.create.mockReturnValue(reaction);
      managerReactionRepo.save.mockResolvedValue(reaction);

      const result = await service.createReaction(dto);

      // Confession loaded with relations for notification lookup
      expect(confessionRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: dto.confessionId } }),
      );

      expect(managerReactionRepo.create).toHaveBeenCalledWith({
        emoji: dto.emoji,
        confession,
        anonymousUser: user,
      });
      expect(managerReactionRepo.save).toHaveBeenCalledWith(reaction);
      expect(result).toEqual(reaction);
    });

    it('returns existing reaction idempotently when same emoji is sent again', async () => {
      const existing = makeReaction({ emoji: '❤️' });

      confessionRepo.findOne.mockResolvedValue(makeConfession());
      anonymousUserRepo.findOne.mockResolvedValue(makeAnonymousUser());
      managerReactionRepo.findOne.mockResolvedValue(existing);

      const result = await service.createReaction(dto);

      expect(managerReactionRepo.create).not.toHaveBeenCalled();
      expect(managerReactionRepo.save).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('updates emoji when user switches reaction', async () => {
      const existing = makeReaction({ emoji: '😂' });
      const updated = { ...existing, emoji: '❤️' } as Reaction;

      confessionRepo.findOne.mockResolvedValue(makeConfession());
      anonymousUserRepo.findOne.mockResolvedValue(makeAnonymousUser());
      managerReactionRepo.findOne.mockResolvedValue(existing);
      managerReactionRepo.save.mockResolvedValue(updated);

      const result = await service.createReaction({ ...dto, emoji: '❤️' });

      expect(managerReactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ emoji: '❤️' }),
      );
      expect(result.emoji).toBe('❤️');
    });

    // ── Invalid confession path ─────────────────────────────────────────────

    it('throws NotFoundException when confession does not exist', async () => {
      confessionRepo.findOne.mockResolvedValue(null);

      await expect(service.createReaction(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createReaction(dto)).rejects.toThrow(
        'Confession not found',
      );

      // Must not proceed to user/reaction lookup
      expect(anonymousUserRepo.findOne).not.toHaveBeenCalled();
      expect(reactionRepo.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when anonymous user does not exist', async () => {
      confessionRepo.findOne.mockResolvedValue(makeConfession());
      anonymousUserRepo.findOne.mockResolvedValue(null);

      await expect(service.createReaction(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createReaction(dto)).rejects.toThrow(
        'Anonymous user not found',
      );

      expect(reactionRepo.create).not.toHaveBeenCalled();
    });

    // ── Schema alignment guard ──────────────────────────────────────────────

    it('does NOT access confession.user at any point (invalid field guard)', async () => {
      /**
       * Regression guard: ensures the service never tries to access a `user`
       * property on AnonymousConfession — that field does not exist on the entity.
       * The correct field is `confession.anonymousUser` (the confession's owner).
       */
      const confession = makeConfession();
      const userAccessSpy = jest.fn();
      Object.defineProperty(confession, 'user', { get: userAccessSpy });

      confessionRepo.findOne.mockResolvedValue(confession);
      anonymousUserRepo.findOne.mockResolvedValue(makeAnonymousUser());
      managerReactionRepo.findOne.mockResolvedValue(null);
      managerReactionRepo.create.mockReturnValue(makeReaction());
      managerReactionRepo.save.mockResolvedValue(makeReaction());

      await service.createReaction(dto);

      expect(userAccessSpy).not.toHaveBeenCalled();
    });

    it('uses anonymousUser relation on Reaction entity, not a plain user field', async () => {
      const confession = makeConfession();
      const user = makeAnonymousUser();
      const reaction = makeReaction({ confession, anonymousUser: user });

      confessionRepo.findOne.mockResolvedValue(confession);
      anonymousUserRepo.findOne.mockResolvedValue(user);
      managerReactionRepo.findOne.mockResolvedValue(null);
      managerReactionRepo.create.mockReturnValue(reaction);
      managerReactionRepo.save.mockResolvedValue(reaction);

      await service.createReaction(dto);

      // Confirm create() was called with `anonymousUser`, NOT `user`
      expect(managerReactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ anonymousUser: user }),
      );
      expect(managerReactionRepo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.anything() }),
      );
    });
  });
});

// ─── Analytics cache invalidation ────────────────────────────────────────────

describe('ReactionService – analytics cache invalidation', () => {
  let service: ReactionService;
  let analyticsService: jest.Mocked<
    Pick<
      AnalyticsService,
      'invalidateTrendingCache' | 'invalidateReactionDistributionCache'
    >
  >;

  const makeManagerRepo = () => ({
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockReturnValue({ id: 'r1', emoji: '❤️' }),
    save: jest.fn().mockResolvedValue({ id: 'r1', emoji: '❤️' }),
  });

  const confession = {
    id: 'conf-1',
    anonymousUser: null,
  } as any;

  const anonUser = { id: 'anon-1' } as any;

  const dto = {
    confessionId: 'conf-1',
    anonymousUserId: 'anon-1',
    emoji: '❤️',
  };

  beforeEach(async () => {
    analyticsService = {
      invalidateTrendingCache: jest.fn().mockResolvedValue(undefined),
      invalidateReactionDistributionCache: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    const managerRepo = makeManagerRepo();
    const dataSourceMock = {
      transaction: jest
        .fn()
        .mockImplementation((cb: any) =>
          cb({ getRepository: jest.fn().mockReturnValue(managerRepo) }),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        {
          provide: getRepositoryToken(Reaction),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(AnonymousConfession),
          useValue: { findOne: jest.fn().mockResolvedValue(confession) },
        },
        {
          provide: getRepositoryToken(AnonymousUser),
          useValue: { findOne: jest.fn().mockResolvedValue(anonUser) },
        },
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get<ReactionService>(ReactionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('invalidates trending cache after a new reaction is persisted', async () => {
    await service.createReaction(dto);
    // Allow the fire-and-forget promises to settle
    await Promise.resolve();
    expect(analyticsService.invalidateTrendingCache).toHaveBeenCalledWith(
      'reaction-mutation',
    );
  });

  it('invalidates reaction distribution cache after a new reaction is persisted', async () => {
    await service.createReaction(dto);
    await Promise.resolve();
    expect(
      analyticsService.invalidateReactionDistributionCache,
    ).toHaveBeenCalledWith('reaction-mutation');
  });

  it('does NOT call analytics invalidation when confession is not found', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        {
          provide: getRepositoryToken(Reaction),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(AnonymousConfession),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: getRepositoryToken(AnonymousUser),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    const svc = module.get<ReactionService>(ReactionService);
    await expect(svc.createReaction(dto)).rejects.toThrow(NotFoundException);
    expect(analyticsService.invalidateTrendingCache).not.toHaveBeenCalled();
    expect(
      analyticsService.invalidateReactionDistributionCache,
    ).not.toHaveBeenCalled();
  });
});
