import { Redis } from 'ioredis';
import { RedisSessionRepository } from '../../../src/session/repositories/RedisSessionRepository';
import { SessionService } from '../../../src/session/services/SessionService';

// Mock Redis
jest.mock('ioredis');

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
} as unknown as Redis;

describe('SessionService Integration Tests', () => {
  let sessionService: SessionService;
  let sessionRepository: RedisSessionRepository;

  const mockSession = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    data: { role: 'admin' },
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionRepository = new RedisSessionRepository(mockRedis);
    sessionService = new SessionService(sessionRepository);
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const input = {
        userId: 'test-user-id',
        data: { role: 'admin' },
        ttl: 3600,
      };

      (mockRedis.set as jest.Mock).mockResolvedValue('OK');

      const result = await sessionService.createSession(input);

      expect(result).toHaveProperty('sessionId');
      expect(result.userId).toBe(input.userId);
      expect(result.data).toEqual(input.data);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:${result.sessionId}`,
        expect.any(String),
        'EX',
        input.ttl
      );
    });
  });

  describe('getSession', () => {
    it('should return a session if it exists', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(
        JSON.stringify(mockSession)
      );

      const result = await sessionService.getSession(mockSession.sessionId);

      expect(result).toEqual(mockSession);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `session:${mockSession.sessionId}`
      );
    });

    it('should return null if session does not exist', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await sessionService.getSession('non-existent-session');

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update an existing session', async () => {
      const updatedData = { role: 'user', newField: 'test' };
      (mockRedis.get as jest.Mock).mockResolvedValue(
        JSON.stringify(mockSession)
      );
      (mockRedis.set as jest.Mock).mockResolvedValue('OK');

      const result = await sessionService.updateSession(mockSession.sessionId, {
        data: updatedData,
      });

      expect(result).toBeDefined();
      expect(result?.data).toEqual(updatedData);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete an existing session', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      const result = await sessionService.deleteSession(mockSession.sessionId);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(
        `session:${mockSession.sessionId}`
      );
    });
  });

  describe('isSessionValid', () => {
    it('should return true for a valid session', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          ...mockSession,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
      );

      const result = await sessionService.isSessionValid(mockSession.sessionId);
      expect(result).toBe(true);
    });

    it('should return false for an expired session', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          ...mockSession,
          expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        })
      );
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      const result = await sessionService.isSessionValid(mockSession.sessionId);
      expect(result).toBe(false);
    });
  });
});
