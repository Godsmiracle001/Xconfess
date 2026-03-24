import { AdminGateway } from './admin.gateway';
import { UserRole } from '../../user/entities/user.entity';

describe('AdminGateway', () => {
  it('emitNewReport broadcasts to server', () => {
    const gateway = new AdminGateway({} as any, {} as any);
    (gateway as any).server = { emit: jest.fn() };

    gateway.emitNewReport({ x: 1 });
    expect((gateway as any).server.emit).toHaveBeenCalledWith('new-report', {
      x: 1,
    });
  });

  it('disconnects if no token provided', async () => {
    const jwt: any = { verify: jest.fn() };
    const userService: any = { findById: jest.fn() };
    const gateway = new AdminGateway(jwt, userService);
    const client: any = {
      id: 's1',
      handshake: { auth: {}, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('accepts admin token and sets client data', async () => {
    const jwt: any = { verify: jest.fn().mockReturnValue({ sub: '1' }) };
    const userService: any = {
      findById: jest.fn().mockResolvedValue({ role: UserRole.ADMIN }),
    };
    const gateway = new AdminGateway(jwt, userService);
    const client: any = {
      id: 's2',
      handshake: { auth: { token: 't' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };
    await gateway.handleConnection(client);
    expect(client.data.userId).toBe(1);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects when token is expired during connection auth', async () => {
    const jwt: any = {
      verify: jest.fn(() => {
        throw new Error('jwt expired');
      }),
    };
    const userService: any = { findById: jest.fn() };
    const gateway = new AdminGateway(jwt, userService);
    const client: any = {
      id: 's-expired',
      handshake: { auth: { token: 'expired-token' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('supports reconnect after transient disconnect', async () => {
    const jwt: any = { verify: jest.fn().mockReturnValue({ sub: '42' }) };
    const userService: any = {
      findById: jest.fn().mockResolvedValue({ role: UserRole.ADMIN }),
    };
    const gateway = new AdminGateway(jwt, userService);

    const firstClient: any = {
      id: 'socket-a',
      handshake: { auth: { token: 't' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };
    const secondClient: any = {
      id: 'socket-b',
      handshake: { auth: { token: 't' }, headers: {} },
      data: {},
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(firstClient);
    gateway.handleDisconnect(firstClient);
    await gateway.handleConnection(secondClient);

    expect(firstClient.data.userId).toBe(42);
    expect(secondClient.data.userId).toBe(42);
    expect(secondClient.disconnect).not.toHaveBeenCalled();
    expect(jwt.verify).toHaveBeenCalledTimes(2);
    expect(userService.findById).toHaveBeenCalledTimes(2);
  });
});
