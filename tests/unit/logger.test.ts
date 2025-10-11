import logger from '@/lib/logger';

describe('logger configuration', () => {
  it('uses silent level during tests to avoid noisy output', () => {
    expect(logger.level).toBe('silent');
  });
});
