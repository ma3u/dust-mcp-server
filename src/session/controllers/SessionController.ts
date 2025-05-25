import type { Request, Response } from 'express';
import { SessionService } from '../services/SessionService.js';
import type { CreateSessionInput, UpdateSessionInput } from '../interfaces/ISession.js';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Create a new session
   */
  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, data, ttl } = req.body as CreateSessionInput;
      
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Valid user ID is required' });
        return;
      }

      const session = await this.sessionService.createSession({
        userId,
        data: data || {},
        ttl: ttl || undefined,
      });

      res.status(201).json({
        sessionId: session.sessionId,
        userId: session.userId,
        expiresAt: session.expiresAt,
        data: session.data
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get a session by ID
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ error: 'Valid session ID is required' });
        return;
      }

      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Don't expose internal fields in the response
      const { userId, expiresAt, data } = session;
      res.json({ sessionId, userId, expiresAt, data });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ 
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Update a session
   */
  updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const updateData = req.body as UpdateSessionInput;

      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ error: 'Valid session ID is required' });
        return;
      }

      const session = await this.sessionService.updateSession(sessionId, updateData);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Don't expose internal fields in the response
      const { userId, expiresAt, data } = session;
      res.json({ sessionId, userId, expiresAt, data });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ 
        error: 'Failed to update session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Delete a session
   */
  deleteSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ error: 'Valid session ID is required' });
        return;
      }

      const success = await this.sessionService.deleteSession(sessionId);

      if (!success) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ 
        error: 'Failed to delete session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get all sessions for a user
   */
  getUserSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Valid user ID is required' });
        return;
      }

      const sessions = await this.sessionService.getUserSessions(userId);
      
      // Sanitize session data before sending response
      const sanitizedSessions = sessions.map(({ sessionId, userId, expiresAt, data }) => ({
        sessionId,
        userId,
        expiresAt,
        data
      }));
      
      res.json(sanitizedSessions);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({ 
        error: 'Failed to get user sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Validate if a session is still valid
   */
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ 
          valid: false,
          error: 'Valid session ID is required' 
        });
        return;
      }

      const session = await this.sessionService.getSession(sessionId);
      
      if (!session) {
        res.json({ valid: false, reason: 'Session not found' });
        return;
      }
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        // Clean up expired session
        await this.sessionService.deleteSession(sessionId);
        res.json({ valid: false, reason: 'Session expired' });
        return;
      }
      
      res.json({ 
        valid: true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          expiresAt: session.expiresAt
        }
      });
    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({ 
        valid: false,
        error: 'Failed to validate session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  extendSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { ttl } = req.body as { ttl: number };

      if (!ttl || ttl <= 0) {
        res.status(400).json({ error: 'Valid TTL is required' });
        return;
      }

      const session = await this.sessionService.extendSession(sessionId, ttl);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Error extending session:', error);
      res.status(500).json({ error: 'Failed to extend session' });
    }
  };
}
