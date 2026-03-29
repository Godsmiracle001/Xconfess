import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WebSocketAdapter } from '../src/websocket/websocket.adapter';
import { ConfigService } from '@nestjs/config';
import { ReactionsGateway } from '../src/reaction/reactions.gateway';
import { buildWebSocketServerOptions } from '../src/websocket/websocket.adapter';

describe('Reactions Integration (e2e)', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  let clientSocket2: Socket;
  let authToken: string;
  let userId: string;
  let confessionId: string;
  const baseUrl = 'http://localhost:3001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);
    const wsAdapter = new WebSocketAdapter(app, configService);
    app.useWebSocketAdapter(wsAdapter);

    await app.init();
    await app.listen(3001);

    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Create test confession
    const confessionResponse = await request(app.getHttpServer())
      .post('/api/v1/confessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Confession',
        content: 'This is a test confession',
        isAnonymous: false,
      });

    confessionId = confessionResponse.body.id;
  });

  afterAll(async () => {
    if (clientSocket?.connected) clientSocket.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
    await app.close();
  });

  beforeEach((done) => {
    clientSocket = io(`${baseUrl}/reactions`, {
      transports: ['websocket'],
      forceNew: true,
    });

    clientSocket.on('connect', () => done());
  });

  afterEach(() => {
    if (clientSocket?.connected) clientSocket.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  describe('Real-time Reaction Flow', () => {
    it('should broadcast reaction:added when user adds reaction via REST API', (done) => {
      // Subscribe to confession
      clientSocket.emit('subscribe:confession', { confessionId });

      clientSocket.once('subscribed', () => {
        // Listen for reaction:added event
        clientSocket.on('reaction:added', (data) => {
          expect(data.confessionId).toBe(confessionId);
          expect(data.reactionType).toBe('like');
          expect(data.userId).toBe(userId);
          expect(data.totalCount).toBe(1);
          done();
        });

        // Add reaction via REST API
        setTimeout(() => {
          request(app.getHttpServer())
            .post('/api/v1/reactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              confessionId,
              reactionType: 'like',
            })
            .expect(201)
            .catch((err) => done(err));
        }, 100);
      });
    });

    it('should broadcast confession:updated with correct counts', (done) => {
      clientSocket.emit('subscribe:confession', { confessionId });

      clientSocket.once('subscribed', () => {
        clientSocket.on('confession:updated', (data) => {
          expect(data.confessionId).toBe(confessionId);
          expect(data.reactionCounts).toHaveProperty('like');
          expect(data.totalReactions).toBeGreaterThan(0);
          done();
        });

        setTimeout(() => {
          request(app.getHttpServer())
            .post('/api/v1/reactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              confessionId,
              reactionType: 'like',
            })
            .catch((err) => done(err));
        }, 100);
      });
    });

    it('should broadcast reaction:removed when user removes reaction', (done) => {
      // First add a reaction
      void request(app.getHttpServer())
        .post('/api/v1/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confessionId,
          reactionType: 'love',
        })
        .then(() => {
          // Subscribe and listen for removal
          clientSocket.emit('subscribe:confession', { confessionId });

          clientSocket.once('subscribed', () => {
            clientSocket.on('reaction:removed', (data) => {
              expect(data.confessionId).toBe(confessionId);
              expect(data.reactionType).toBe('love');
              done();
            });

            // Remove reaction
            setTimeout(() => {
              void request(app.getHttpServer())
                .delete(`/api/v1/reactions/${confessionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .catch((err) => done(err));
            }, 100);
          });
        })
        .catch((err) => done(err));
    });
  });

  describe('Multiple Clients', () => {
    it('should broadcast to all subscribed clients', (done) => {
      let receivedCount = 0;

      // Create second client
      clientSocket2 = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket2.on('connect', () => {
        // Both clients subscribe
        clientSocket.emit('subscribe:confession', { confessionId });
        clientSocket2.emit('subscribe:confession', { confessionId });

        // Set up listeners
        clientSocket.on('reaction:added', () => {
          receivedCount++;
          if (receivedCount === 2) done();
        });

        clientSocket2.on('reaction:added', () => {
          receivedCount++;
          if (receivedCount === 2) done();
        });

        // Wait for both subscriptions, then add reaction
        setTimeout(() => {
          request(app.getHttpServer())
            .post('/api/v1/reactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              confessionId,
              reactionType: 'wow',
            })
            .catch((err) => done(err));
        }, 200);
      });
    });

    it('should not broadcast to unsubscribed clients', (done) => {
      let client1Received = false;
      let client2Received = false;

      clientSocket2 = io(`${baseUrl}/reactions`, {
        transports: ['websocket'],
        forceNew: true,
      });

      clientSocket2.on('connect', () => {
        // Only client1 subscribes
        clientSocket.emit('subscribe:confession', { confessionId });

        clientSocket.on('reaction:added', () => {
          client1Received = true;
        });

        clientSocket2.on('reaction:added', () => {
          client2Received = true;
        });

        setTimeout(() => {
          request(app.getHttpServer())
            .post('/api/v1/reactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              confessionId,
              reactionType: 'haha',
            })
            .then(() => {
              setTimeout(() => {
                expect(client1Received).toBe(true);
                expect(client2Received).toBe(false);
                done();
              }, 100);
            })
            .catch((err) => done(err));
        }, 200);
      });
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle multiple reactions from different users', async () => {
      // Create second user
      const user2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'Test123!@#',
        });

      const token2 = user2Response.body.token;

      // Add reactions from both users
      await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/reactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ confessionId, reactionType: 'like' }),
        request(app.getHttpServer())
          .post('/api/v1/reactions')
          .set('Authorization', `Bearer ${token2}`)
          .send({ confessionId, reactionType: 'love' }),
      ]);

      // Get reaction counts
      const countsResponse = await request(app.getHttpServer())
        .get(`/api/v1/reactions/confession/${confessionId}/counts`)
        .expect(200);

      expect(countsResponse.body.totalReactions).toBeGreaterThanOrEqual(2);
      expect(countsResponse.body.reactionCounts).toHaveProperty('like');
      expect(countsResponse.body.reactionCounts).toHaveProperty('love');
    });
  });

  describe('Performance', () => {
    it('should handle 10+ concurrent connections', (done) => {
      const clients: Socket[] = [];
      let connectedCount = 0;
      const targetConnections = 10;

      for (let i = 0; i < targetConnections; i++) {
        const client = io(`${baseUrl}/reactions`, {
          transports: ['websocket'],
          forceNew: true,
        });

        client.on('connect', () => {
          connectedCount++;
          if (connectedCount === targetConnections) {
            // All connected, verify stats
            request(app.getHttpServer())
              .get('/api/v1/websocket/stats')
              .expect(200)
              .then((response) => {
                expect(response.body.totalConnections).toBeGreaterThanOrEqual(
                  targetConnections,
                );

                // Cleanup
                clients.forEach((c) => c.disconnect());
                done();
              })
              .catch(done);
          }
        });

        clients.push(client);
      }
    });

    it('should measure broadcast latency', (done) => {
      const startTime = Date.now();

      clientSocket.emit('subscribe:confession', { confessionId });

      clientSocket.once('subscribed', () => {
        clientSocket.on('reaction:added', () => {
          const latency = Date.now() - startTime;
          console.log(`Broadcast latency: ${latency}ms`);
          expect(latency).toBeLessThan(500); // Should be fast on local network
          done();
        });

        request(app.getHttpServer())
          .post('/api/v1/reactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            confessionId,
            reactionType: 'sad',
          })
          .catch((err) => done(err));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid confession ID gracefully', (done) => {
      clientSocket.emit('subscribe:confession', { confessionId: 'invalid-id' });

      clientSocket.on('subscribed', (data) => {
        // Should still subscribe, just won't receive events
        expect(data.confessionId).toBe('invalid-id');
        done();
      });
    });

    it('should handle missing confession ID', (done) => {
      clientSocket.emit('subscribe:confession', {});

      clientSocket.on('error', (data) => {
        expect(data.message).toContain('required');
        done();
      });
    });
  });

  describe('WebSocket Health', () => {
    it('should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/websocket/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.websocket.enabled).toBe(true);
    });

    it('should return connection statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/websocket/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalConnections');
      expect(response.body).toHaveProperty('connectionsPerIP');
      expect(response.body).toHaveProperty('activeRooms');
    });
  });
});

describe('ReactionsGateway fanout and reconnect unit coverage', () => {
  const createGateway = () => {
    const configService: any = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };
    const wsLogger: any = {
      logSubscriptionRejected: jest.fn(),
      logSubscriptionGranted: jest.fn(),
      logEvent: jest.fn(),
    };
    return new ReactionsGateway(configService, wsLogger);
  };

  const createSocketClient = (id: string, ip = '127.0.0.1') =>
    ({
      id,
      handshake: {
        address: ip,
        headers: {},
      },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    }) as any;

  it('reconnects after network interruption and re-subscribes to room', () => {
    const gateway = createGateway();
    const disconnectedClient = createSocketClient('socket-old');
    const reconnectedClient = createSocketClient('socket-new');

    gateway.handleConnection(disconnectedClient);
    gateway.handleSubscribeToConfession(disconnectedClient, {
      confessionId: 'c-1',
    });
    gateway.handleDisconnect(disconnectedClient);

    gateway.handleConnection(reconnectedClient);
    gateway.handleSubscribeToConfession(reconnectedClient, {
      confessionId: 'c-1',
    });

    expect(disconnectedClient.join).toHaveBeenCalledWith('confession:c-1');
    expect(reconnectedClient.join).toHaveBeenCalledWith('confession:c-1');
    expect(reconnectedClient.emit).toHaveBeenCalledWith(
      'subscribed',
      expect.objectContaining({ confessionId: 'c-1' }),
    );
  });

  it('broadcastReactionAdded fans out only to target channel', () => {
    const gateway = createGateway();
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (gateway as any).server = { to };

    gateway.broadcastReactionAdded('conf-123', {
      reactionId: 'r-1',
      userId: 'u-1',
      reactionType: 'like',
      timestamp: new Date(),
      totalCount: 3,
    });

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('confession:conf-123');
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'reaction:added',
      expect.objectContaining({
        confessionId: 'conf-123',
        totalCount: 3,
      }),
    );
  });

  it('broadcast fanout counts match intended subscriber scope across channels', () => {
    const gateway = createGateway();
    const roomEmitters = new Map<string, jest.Mock>();
    const to = jest.fn((room: string) => {
      if (!roomEmitters.has(room)) {
        roomEmitters.set(room, jest.fn());
      }
      return { emit: roomEmitters.get(room)! };
    });
    (gateway as any).server = { to };

    gateway.broadcastReactionAdded('room-a', {
      reactionId: 'r-a1',
      userId: 'u-1',
      reactionType: 'like',
      timestamp: new Date(),
      totalCount: 1,
    });
    gateway.broadcastReactionRemoved('room-a', {
      reactionId: 'r-a1',
      userId: 'u-1',
      reactionType: 'like',
      timestamp: new Date(),
      totalCount: 0,
    });
    gateway.broadcastConfessionUpdated('room-b', {
      reactionCounts: { wow: 2 },
      totalReactions: 2,
      timestamp: new Date(),
    });

    const roomAEmitter = roomEmitters.get('confession:room-a');
    const roomBEmitter = roomEmitters.get('confession:room-b');

    expect(to).toHaveBeenCalledWith('confession:room-a');
    expect(to).toHaveBeenCalledWith('confession:room-b');
    expect(roomAEmitter).toBeDefined();
    expect(roomBEmitter).toBeDefined();
    expect(roomAEmitter).toHaveBeenCalledTimes(2);
    expect(roomBEmitter).toHaveBeenCalledTimes(1);
    expect(roomAEmitter).toHaveBeenNthCalledWith(
      1,
      'reaction:added',
      expect.objectContaining({ confessionId: 'room-a' }),
    );
    expect(roomAEmitter).toHaveBeenNthCalledWith(
      2,
      'reaction:removed',
      expect.objectContaining({ confessionId: 'room-a' }),
    );
    expect(roomBEmitter).toHaveBeenCalledWith(
      'confession:updated',
      expect.objectContaining({ confessionId: 'room-b' }),
    );
  });

  it('websocket adapter options keep reconnect-friendly transport and heartbeat defaults', () => {
    const options = buildWebSocketServerOptions('https://frontend.example');

    expect(options.transports).toEqual(['websocket', 'polling']);
    expect(options.allowUpgrades).toBe(true);
    expect(options.pingTimeout).toBe(60000);
    expect(options.pingInterval).toBe(25000);
    expect(options.upgradeTimeout).toBe(10000);
    expect(options.cors).toEqual({
      origin: 'https://frontend.example',
      credentials: true,
      methods: ['GET', 'POST'],
    });
  });
});
