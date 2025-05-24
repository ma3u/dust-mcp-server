import { Request, Response } from 'express';
import { SessionService } from '../services/SessionService';
import { CreateSessionInput, UpdateSessionInput } from '../interfaces/ISession';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, data, ttl } = req.body as CreateSessionInput;
      
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const session = await this.sessionService.createSession({
        userId,
        data,
        ttl,
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  };

  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await this.sessionService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  };

  updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const updates: UpdateSessionInput = req.body;

      const session = await this.sessionService.updateSession(sessionId, updates);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  };

  deleteSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const deleted = await this.sessionService.deleteSession(sessionId);

      if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  };

  getUserSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const sessions = await this.sessionService.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({ error: 'Failed to get user sessions' });
    }
  };

  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const isValid = await this.sessionService.isSessionValid(sessionId);
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error validating session:', error);
      res.status(500).json({ error: 'Failed to validate session' });
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
