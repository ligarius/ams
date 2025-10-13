import pino from 'pino';
import env from '@/config/env';

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const isNextRuntime =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? Boolean(process.env.NEXT_RUNTIME)
    : false;

const disablePrettyTransport =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env.AMS_DISABLE_PRETTY_LOGGER === 'true'
    : false;

const shouldUsePrettyTransport =
  !isProduction && !isTest && !isNextRuntime && !disablePrettyTransport;

const logger = pino({
  level: isProduction ? 'info' : isTest ? 'silent' : 'debug',
  transport: shouldUsePrettyTransport
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});

export default logger;
