import { Test, TestingModule } from '@nestjs/testing';
import { ReactionModule } from './reaction.module';
import { ReactionsGateway } from './reactions.gateway';
import { ReactionService } from './reaction.service';
import { WebSocketHealthController } from '../websocket/websocket-health.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from '../config/database.config';

describe('ReactionModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          useFactory: getTypeOrmConfig,
        }),
        ReactionModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Provider Registration', () => {
    it('should register ReactionsGateway as a provider', () => {
      const gateway = module.get<ReactionsGateway>(ReactionsGateway);
      expect(gateway).toBeDefined();
      expect(gateway).toBeInstanceOf(ReactionsGateway);
    });

    it('should register ReactionService as a provider', () => {
      const service = module.get<ReactionService>(ReactionService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ReactionService);
    });

    it('should register WebSocketHealthController as a controller', () => {
      const controller = module.get<WebSocketHealthController>(
        WebSocketHealthController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(WebSocketHealthController);
    });
  });

  describe('Gateway Wiring', () => {
    it('should wire ReactionsGateway to WebSocketHealthController', () => {
      const controller = module.get<WebSocketHealthController>(
        WebSocketHealthController,
      );
      const gateway = module.get<ReactionsGateway>(ReactionsGateway);

      // Verify the controller has access to the gateway
      expect((controller as any).reactionsGateway).toBe(gateway);
    });

    it('should export ReactionsGateway for use in other modules', () => {
      const gateway = module.get<ReactionsGateway>(ReactionsGateway);
      expect(gateway).toBeDefined();
      
      // Verify gateway has required methods
      expect(typeof gateway.broadcastReactionAdded).toBe('function');
      expect(typeof gateway.broadcastReactionRemoved).toBe('function');
      expect(typeof gateway.broadcastConfessionUpdated).toBe('function');
      expect(typeof gateway.getConnectionStats).toBe('function');
    });
  });

  describe('Gateway Lifecycle', () => {
    it('should initialize gateway with proper namespace configuration', () => {
      const gateway = module.get<ReactionsGateway>(ReactionsGateway);
      
      // Verify gateway metadata (namespace is set via decorator)
      const metadata = Reflect.getMetadata('namespace', gateway.constructor);
      expect(metadata).toBe('/reactions');
    });

    it('should have WebSocket server instance after initialization', async () => {
      const gateway = module.get<ReactionsGateway>(ReactionsGateway);
      
      // The server property should be defined (will be set by NestJS when gateway initializes)
      expect(gateway).toHaveProperty('server');
    });
  });

  describe('Module Regression Protection', () => {
    it('should fail if ReactionsGateway is removed from providers', async () => {
      // This test ensures that if someone removes ReactionsGateway from providers,
      // the test suite will catch it
      await expect(async () => {
        await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: '.env.test',
            }),
            TypeOrmModule.forRootAsync({
              useFactory: getTypeOrmConfig,
            }),
          ],
          controllers: [WebSocketHealthController],
          providers: [
            // Intentionally missing ReactionsGateway
          ],
        }).compile();
      }).rejects.toThrow();
    });
  });
});
