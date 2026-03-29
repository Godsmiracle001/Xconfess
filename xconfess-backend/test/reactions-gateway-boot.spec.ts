import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { WebSocketAdapter } from '../src/websocket/websocket.adapter';
import { ConfigService } from '@nestjs/config';
import { ReactionsGateway } from '../src/reaction/reactions.gateway';

/**
 * Boot-time integration test that verifies ReactionsGateway is properly
 * instantiated and the /reactions namespace is live and accepting connections.
 * 
 * This test serves as regression protection - if ReactionsGateway is ever
 * removed from the module providers, this test will fail.
 */
describe('ReactionsGateway Boot Integration', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  const baseUrl = 'http://localhost:3002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);
    const wsAdapter = new WebSocketAdapter(app, configService);
    app.useWebSocketAdapter(wsAdapter);

    await app.init();
    await app.listen(3002);
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Gateway Instantiation', () => {
    it('should have ReactionsGateway registered in the module graph', () => {
      const gateway = app.get(ReactionsGateway);
      expect(gateway).toBeDefined();
      expect(gateway).toBeInstanceOf(ReactionsGateway);
    });

    it('should have WebSocket server initialized on ReactionsGateway', () => {
      const gateway = app.get(ReactionsGateway);
      expect(gateway.server).toBeDefined();
      expect(gateway.server.sockets).toBeDefined();
    });
  });

  describe('Namespace Availability', () => {
    it('should accept connections on /reactions namespace', (done) => {
      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should receive connected event with socket ID', (done) => {
      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket.on('connected', (data) => {
        expect(data.message).toContain('Successfully connected');
        expect(data.socketId).toBe(clientSocket.id);
        done();
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const clients: Socket[] = [];
      let connectedCount = 0;
      const targetConnections = 5;

      for (let i = 0; i < targetConnections; i++) {
        const client = io(`${baseUrl}/reactions`, {
          transports: ['websocket'],
          forceNew: true,
        });

        client.on('connect', () => {
          connectedCount++;
          if (connectedCount === targetConnections) {
            // Verify all clients are connected
            expect(clients.every((c) => c.connected)).toBe(true);
            
            // Cleanup
            clients.forEach((c) => c.disconnect());
            done();
          }
        });

        client.on('connect_error', (error) => {
          clients.forEach((c) => c.disconnect());
          done(new Error(`Connection ${i} failed: ${error.message}`));
        });

        clients.push(client);
      }
    });
  });

  describe('Subscription Functionality', () => {
    beforeEach((done) => {
      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket.on('connect', () => done());
    });

    it('should accept subscription to confession rooms', (done) => {
      const testConfessionId = 'test-confession-123';

      clientSocket.emit('subscribe:confession', {
        confessionId: testConfessionId,
      });

      clientSocket.on('subscribed', (data) => {
        expect(data.confessionId).toBe(testConfessionId);
        expect(data.message).toContain('Subscribed');
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Subscription failed: ${error.message}`));
      });
    });

    it('should reject subscription with missing confession ID', (done) => {
      clientSocket.emit('subscribe:confession', {});

      clientSocket.on('error', (data) => {
        expect(data.message).toContain('required');
        done();
      });

      // Timeout if no error received
      setTimeout(() => {
        done(new Error('Expected error event was not received'));
      }, 1000);
    });

    it('should handle unsubscription from confession rooms', (done) => {
      const testConfessionId = 'test-confession-456';

      // First subscribe
      clientSocket.emit('subscribe:confession', {
        confessionId: testConfessionId,
      });

      clientSocket.once('subscribed', () => {
        // Then unsubscribe
        clientSocket.emit('unsubscribe:confession', {
          confessionId: testConfessionId,
        });

        clientSocket.on('unsubscribed', (data) => {
          expect(data.confessionId).toBe(testConfessionId);
          expect(data.message).toContain('Unsubscribed');
          done();
        });
      });
    });
  });

  describe('Broadcast Capability', () => {
    it('should have broadcast methods available on gateway instance', () => {
      const gateway = app.get(ReactionsGateway);

      expect(typeof gateway.broadcastReactionAdded).toBe('function');
      expect(typeof gateway.broadcastReactionRemoved).toBe('function');
      expect(typeof gateway.broadcastConfessionUpdated).toBe('function');
    });

    it('should broadcast to subscribed clients', (done) => {
      const testConfessionId = 'broadcast-test-789';
      const gateway = app.get(ReactionsGateway);

      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe:confession', {
          confessionId: testConfessionId,
        });

        clientSocket.once('subscribed', () => {
          // Listen for broadcast
          clientSocket.on('reaction:added', (data) => {
            expect(data.confessionId).toBe(testConfessionId);
            expect(data.reactionType).toBe('like');
            expect(data.totalCount).toBe(1);
            done();
          });

          // Trigger broadcast from gateway
          setTimeout(() => {
            gateway.broadcastReactionAdded(testConfessionId, {
              reactionId: 'r-test-1',
              userId: 'u-test-1',
              reactionType: 'like',
              timestamp: new Date(),
              totalCount: 1,
            });
          }, 100);
        });
      });
    });
  });

  describe('Connection Statistics', () => {
    it('should track connection statistics', () => {
      const gateway = app.get(ReactionsGateway);
      const stats = gateway.getConnectionStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('connectionsPerIP');
      expect(stats).toHaveProperty('activeRooms');
      expect(typeof stats.totalConnections).toBe('number');
    });

    it('should update statistics when clients connect', (done) => {
      const gateway = app.get(ReactionsGateway);
      const initialStats = gateway.getConnectionStats();
      const initialCount = initialStats.totalConnections;

      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket.on('connect', () => {
        setTimeout(() => {
          const updatedStats = gateway.getConnectionStats();
          expect(updatedStats.totalConnections).toBeGreaterThan(initialCount);
          done();
        }, 100);
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach((done) => {
      clientSocket = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket.on('connect', () => done());
    });

    it('should enforce rate limits on subscription requests', (done) => {
      let errorReceived = false;
      const maxRequests = 30; // From gateway configuration

      clientSocket.on('error', (data) => {
        if (data.message.includes('Rate limit')) {
          errorReceived = true;
        }
      });

      // Send more requests than the rate limit allows
      for (let i = 0; i < maxRequests + 5; i++) {
        clientSocket.emit('subscribe:confession', {
          confessionId: `test-${i}`,
        });
      }

      // Check if rate limit was triggered
      setTimeout(() => {
        expect(errorReceived).toBe(true);
        done();
      }, 500);
    });
  });

  describe('Regression Protection', () => {
    it('should fail if gateway is not in module providers', async () => {
      // This test documents the expected behavior when gateway is missing
      // If ReactionsGateway is removed from ReactionModule providers,
      // app.get(ReactionsGateway) will throw an error
      
      expect(() => {
        const gateway = app.get(ReactionsGateway);
        expect(gateway).toBeDefined();
      }).not.toThrow();
    });

    it('should have gateway accessible from WebSocketHealthController', () => {
      const gateway = app.get(ReactionsGateway);
      expect(gateway).toBeDefined();
      
      // Verify the gateway has the expected interface
      expect(gateway.getConnectionStats).toBeDefined();
      expect(typeof gateway.getConnectionStats).toBe('function');
    });
  });
});
