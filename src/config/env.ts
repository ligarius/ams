import dotenv from 'dotenv';

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? '3000'),
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? 'access-secret',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? 'refresh-secret',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '15m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL ?? '7d',
  LOGIN_MAX_ATTEMPTS: Number(process.env.LOGIN_MAX_ATTEMPTS ?? '5'),
  LOGIN_LOCK_WINDOW_MINUTES: Number(process.env.LOGIN_LOCK_WINDOW_MINUTES ?? '15'),
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  SIGNATURE_PROVIDER: process.env.SIGNATURE_PROVIDER ?? 'DOCUSIGN',
  SIGNATURE_API_BASE_URL: process.env.SIGNATURE_API_BASE_URL ?? 'https://signature.local',
  SIGNATURE_ACCOUNT_ID: process.env.SIGNATURE_ACCOUNT_ID ?? 'default-account',
  SIGNATURE_API_TOKEN: process.env.SIGNATURE_API_TOKEN ?? 'test-token',
  SIGNATURE_WEBHOOK_SECRET: process.env.SIGNATURE_WEBHOOK_SECRET ?? 'signature-secret',
};

export default env;
