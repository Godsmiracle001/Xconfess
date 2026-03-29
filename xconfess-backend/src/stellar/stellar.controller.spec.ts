import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StellarController } from './stellar.controller';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { UserRole } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StellarInvokeContractGuard } from './guards/stellar-invoke-contract.guard';
import { UserService } from '../user/user.service';

describe('StellarController authz', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let contractServiceMock: { invokeContract: jest.Mock };

  const SIGNER_SECRET = 'SIGNER_SECRET';
  const JWT_SECRET = 'JWT_TEST_SECRET_123';

  const makePayload = (opts: {
    sub: number;
    scopes?: string[];
    role?: UserRole;
  }) => ({
    sub: opts.sub,
    username: `user-${opts.sub}`,
    email: `user-${opts.sub}@example.com`,
    role: opts.role ?? UserRole.USER,
    scopes: opts.scopes ?? [],
  });

  beforeAll(async () => {
    contractServiceMock = {
      invokeContract: jest.fn().mockResolvedValue({
        hash: 'tx-hash',
        success: true,
        result: { ok: true },
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [StellarController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        StellarInvokeContractGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STELLAR_SERVER_SECRET') return SIGNER_SECRET;
              if (key === 'JWT_SECRET') return JWT_SECRET;
              return undefined;
            }),
          },
        },
        {
          provide: StellarService,
          useValue: { getNetworkConfig: jest.fn() },
        },
        { provide: ContractService, useValue: contractServiceMock },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ role: UserRole.ADMIN }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/stellar/invoke-contract')
      .send({
        contractId: 'contract-1',
        functionName: 'invoke',
        args: [],
        sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      });

    expect(res.status).toBe(401);
  });

  it('returns 403 when required scope claim is missing', async () => {
    const token = jwtService.sign(makePayload({ sub: 2, scopes: [] }));

    const res = await request(app.getHttpServer())
      .post('/stellar/invoke-contract')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contractId: 'contract-1',
        functionName: 'invoke',
        args: [],
        sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      });

    expect(res.status).toBe(403);
    expect(contractServiceMock.invokeContract).not.toHaveBeenCalled();
  });

  it('succeeds when required scope claim is present', async () => {
    const token = jwtService.sign(
      makePayload({ sub: 1, scopes: ['stellar:invoke-contract'] }),
    );

    const res = await request(app.getHttpServer())
      .post('/stellar/invoke-contract')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contractId: 'contract-1',
        functionName: 'invoke',
        args: [{ x: 1 }],
        sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      });

    expect([200, 201]).toContain(res.status);
    expect(contractServiceMock.invokeContract).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('hash', 'tx-hash');
  });
});
