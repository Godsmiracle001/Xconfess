import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { Reaction } from './entities/reaction.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        { provide: getRepositoryToken(Reaction), useFactory: repoMock },
        {
          provide: getRepositoryToken(AnonymousConfession),
          useFactory: repoMock,
        },
        { provide: getRepositoryToken(AnonymousUser), useFactory: repoMock },
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
      reactionRepo.findOne.mockResolvedValue(null);
      reactionRepo.create.mockReturnValue(reaction);
      reactionRepo.save.mockResolvedValue(reaction);

      const result = await service.createReaction(dto);

      // Confession loaded WITHOUT invalid relations
      expect(confessionRepo.findOne).toHaveBeenCalledWith({
        where: { id: dto.confessionId },
      });
      // No 'relations: [user]' or 'relations: [anonymousUser]' on confession lookup
      expect(confessionRepo.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ relations: expect.anything() }),
      );

      expect(reactionRepo.create).toHaveBeenCalledWith({
        emoji: dto.emoji,
        confession,
        anonymousUser: user,
      });
      expect(reactionRepo.save).toHaveBeenCalledWith(reaction);
      expect(result).toEqual(reaction);
    });

    it('returns existing reaction idempotently when same emoji is sent again', async () => {
      const existing = makeReaction({ emoji: '❤️' });

      confessionRepo.findOne.mockResolvedValue(makeConfession());
      anonymousUserRepo.findOne.mockResolvedValue(makeAnonymousUser());
      reactionRepo.findOne.mockResolvedValue(existing);

      const result = await service.createReaction(dto);

      expect(reactionRepo.create).not.toHaveBeenCalled();
      expect(reactionRepo.save).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('updates emoji when user switches reaction', async () => {
      const existing = makeReaction({ emoji: '😂' });
      const updated = { ...existing, emoji: '❤️' } as Reaction;

      confessionRepo.findOne.mockResolvedValue(makeConfession());
      anonymousUserRepo.findOne.mockResolvedValue(makeAnonymousUser());
      reactionRepo.findOne.mockResolvedValue(existing);
      reactionRepo.save.mockResolvedValue(updated);

      const result = await service.createReaction({ ...dto, emoji: '❤️' });

      expect(reactionRepo.save).toHaveBeenCalledWith(
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
      reactionRepo.findOne.mockResolvedValue(null);
      reactionRepo.create.mockReturnValue(makeReaction());
      reactionRepo.save.mockResolvedValue(makeReaction());

      await service.createReaction(dto);

      expect(userAccessSpy).not.toHaveBeenCalled();
    });

    it('uses anonymousUser relation on Reaction entity, not a plain user field', async () => {
      const confession = makeConfession();
      const user = makeAnonymousUser();
      const reaction = makeReaction({ confession, anonymousUser: user });

      confessionRepo.findOne.mockResolvedValue(confession);
      anonymousUserRepo.findOne.mockResolvedValue(user);
      reactionRepo.findOne.mockResolvedValue(null);
      reactionRepo.create.mockReturnValue(reaction);
      reactionRepo.save.mockResolvedValue(reaction);

      await service.createReaction(dto);

      // Confirm create() was called with `anonymousUser`, NOT `user`
      expect(reactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ anonymousUser: user }),
      );
      expect(reactionRepo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.anything() }),
      );
    });
  });
});
