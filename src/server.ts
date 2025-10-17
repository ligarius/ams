import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import authRoutes from '@/routes/authRoutes';
import userRoutes from '@/routes/userRoutes';
import projectRoutes from '@/routes/projectRoutes';
import companyRoutes from '@/routes/companyRoutes';
import signatureRoutes from '@/routes/signatureRoutes';
import portalRoutes from '@/routes/portalRoutes';
import { cacheControlMiddleware } from '@/middleware/cacheControl';
import { errorHandler } from '@/middleware/errorHandler';
import logger from '@/lib/logger';
import collectPrometheusMetrics from '@/services/metricsService';

export const createApp = () => {
  const app = express();
  app.disable('etag');

  app.use(pinoHttp({ logger }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "img-src": ["'self'", 'data:'],
          "object-src": ["'none'"],
          "connect-src": ["'self'"],
          "frame-ancestors": ["'none'"],
          "upgrade-insecure-requests": [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    legacyHeaders: false,
    standardHeaders: true,
    message: { message: 'Too many requests, please slow down' },
  }));
  app.use(express.json());
  app.use(cacheControlMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/metrics', async (_req, res, next) => {
    try {
      const payload = await collectPrometheusMetrics();
      res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(payload);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/signatures', signatureRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/portal', portalRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use(errorHandler);

  return app;
};
