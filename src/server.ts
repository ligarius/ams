import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import authRoutes from '@/routes/authRoutes';
import userRoutes from '@/routes/userRoutes';
import projectRoutes from '@/routes/projectRoutes';
import { cacheControlMiddleware } from '@/middleware/cacheControl';
import { errorHandler } from '@/middleware/errorHandler';
import logger from '@/lib/logger';

export const createApp = () => {
  const app = express();
  app.disable('etag');

  app.use(pinoHttp({ logger }));
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
      },
    },
    hsts: true,
  }));
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    legacyHeaders: false,
    standardHeaders: true,
  }));
  app.use(express.json());
  app.use(cacheControlMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/projects', projectRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use(errorHandler);

  return app;
};
