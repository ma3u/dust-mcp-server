import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import type { Redis } from 'ioredis';
import { SessionController } from '../controllers/SessionController.js';
import { SessionService } from '../services/SessionService.js';

/**
 * Create and configure the session router
 * @param redisClient Optional Redis client (will use memory store if not provided)
 * @returns Configured Express router
 */
export const createSessionRouter = (redisClient?: Redis): Router => {
  const router = Router();

  // Initialize session service with the appropriate store
  const sessionService = SessionService.getInstance(redisClient);
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
/**
 * Middleware that can be used to protect routes
 * Validates the session and attaches it to the request object
 */
export const sessionMiddleware = (redisClient?: Redis) => {
  // Get the session service instance
  const sessionService = SessionService.getInstance(redisClient);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Try to get session ID from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let sessionId: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.split(' ')[1];
    } else if (req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (!sessionId) {
      return res.status(401).json({ error: 'No session ID provided' });
    }

    try {
      const session = await sessionService.getSession(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await sessionService.deleteSession(sessionId);
        return res.status(401).json({ error: 'Session expired' });
      }

      // Attach session to request for use in route handlers
      (req as any).session = session;
      next();
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Failed to validate session' });
    }
  };
};
