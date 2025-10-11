import env from '@/config/env';
import { createApp } from '@/server';
import logger from '@/lib/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server listening');
});
