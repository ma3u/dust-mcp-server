import { Router } from 'express';
import { z } from 'zod';
import agentService from '../../services/agentService';
import { logger } from '../../utils/logger';

const router = Router();

// Schema validation
const CreateSessionSchema = z.object({
  agentId: z.string(),
  context: z.record(z.unknown()).optional(),
});

const SendMessageSchema = z.object({
  message: z.string(),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })).optional(),
});

/**
 * @openapi
 * /api/agents:
 *   get:
 *     summary: List all available agents
 *     responses:
 *       200:
 *         description: List of available agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 */
router.get('/agents', async (req, res) => {
  try {
    const agents = await agentService.listAgents();
    res.json(agents);
  } catch (error) {
    logger.error('Failed to list agents', { error });
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * @openapi
 * /api/agents/{agentId}:
 *   get:
 *     summary: Get agent details
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the agent to retrieve
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       404:
 *         description: Agent not found
 */
router.get('/agents/:agentId', async (req, res) => {
  try {
    const agent = await agentService.getAgent(req.params.agentId);
    res.json(agent);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to get agent', { error });
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

/**
 * @openapi
 * /api/sessions:
 *   post:
 *     summary: Create a new session with an agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 */
router.post('/sessions', async (req, res) => {
  try {
    const { agentId, context = {} } = CreateSessionSchema.parse(req.body);
    const session = await agentService.createSession(agentId, context);
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    logger.error('Failed to create session', { error });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * @openapi
 * /api/sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message to an agent
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     content:
 *                       type: string
 *                       format: binary
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 context:
 *                   type: object
 */
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, files = [] } = SendMessageSchema.parse(req.body);
    
    // Convert base64 file content to Buffer if needed
    const processedFiles = files.map(file => ({
      name: file.name,
      content: Buffer.from(file.content, 'base64'),
    }));
    
    const result = await agentService.sendMessage(sessionId, message, processedFiles);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to send message', { error });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @openapi
 * /api/sessions/{sessionId}:
 *   delete:
 *     summary: End a session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session to end
 *     responses:
 *       204:
 *         description: Session ended successfully
 *       404:
 *         description: Session not found
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await agentService.endSession(sessionId);
    res.status(204).end();
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to end session', { error });
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;
