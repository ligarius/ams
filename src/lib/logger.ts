import pino from 'pino';
import env from '@/config/env';

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const logger = pino({
  level: isProduction ? 'info' : isTest ? 'silent' : 'debug',
  transport: isProduction || isTest ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export default logger;
