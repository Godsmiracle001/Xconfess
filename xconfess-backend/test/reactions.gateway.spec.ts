import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { WebSocketAdapter } from '../src/websocket.adapter';
import { ConfigService } from '@nestjs/config';

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
      request(app.getHttpServer())
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
              request(app.getHttpServer())
                .delete(`/api/v1/reactions/${confessionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .catch((err) => done(err));
            }, 100);
          });
        });
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
                expect(response.body.totalConnections).toBeGreaterThanOrEqual(targetConnections);
                
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