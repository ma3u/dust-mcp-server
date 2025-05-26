import express from 'express';
import { createServer } from 'http';
import { redisClient } from './config/redis';
import { sessionMiddleware } from './session/routes/sessionRoutes';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { getLogger } from './utils/logger';
import agentRoutes from './api/routes/agentRoutes';

// Initialize logger
const logger = getLogger({ logFilePrefix: 'app' });

// Create Express app
const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(sessionMiddleware(redisClient));

// API Routes
app.use('/api', agentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisClient.status === 'ready' ? 'connected' : 'disconnected',
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

export { app, httpServer };

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server:', err);
          return reject(err);
        }
        resolve();
      });
    });

    await redisClient.quit();
    logger.info('Server and Redis connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});
