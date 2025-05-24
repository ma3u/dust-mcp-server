import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';
import { SessionService } from '../services/SessionService';
import { RedisSessionRepository } from '../repositories/RedisSessionRepository';
import { Redis } from 'ioredis';

export const createSessionRouter = (redisClient: Redis): Router => {
  const router = Router();
  const sessionRepository = new RedisSessionRepository(redisClient);
  const sessionService = new SessionService(sessionRepository);
  const sessionController = new SessionController(sessionService);

  // Create a new session
  router.post('/', sessionController.createSession);

  // Get session by ID
  router.get('/:sessionId', sessionController.getSession);

  // Update session
  router.patch('/:sessionId', sessionController.updateSession);

  // Delete session
  router.delete('/:sessionId', sessionController.deleteSession);

  // Get all sessions for a user
  router.get('/user/:userId', sessionController.getUserSessions);

  // Validate session
  router.get('/:sessionId/validate', sessionController.validateSession);

  // Extend session TTL
  router.post('/:sessionId/extend', sessionController.extendSession);

  return router;
};

// Middleware that can be used to protect routes
export const sessionMiddleware = (redisClient: Redis) => {
  const sessionRepository = new RedisSessionRepository(redisClient);
  const sessionService = new SessionService(sessionRepository);

  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionId = authHeader.split(' ')[1];
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Attach session to request for use in route handlers
    req.session = session;
    next();
  };
};
