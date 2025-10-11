import { login } from '@/services/authService';
import prisma, { resetDatabase } from '@/lib/prisma';

describe('AuthService', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('logs in successfully with valid credentials', async () => {
    const result = await login('admin@example.com', 'Admin123!');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('admin@example.com');
  });

  it('increments failed attempts on invalid password', async () => {
    await expect(login('admin@example.com', 'wrongpass')).rejects.toMatchObject({ status: 401 });
    const user = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(user?.failedLoginAttempts).toBe(1);
  });

  it('locks the user after reaching max attempts', async () => {
    for (let i = 0; i < 4; i += 1) {
      await expect(login('admin@example.com', 'wrongpass')).rejects.toMatchObject({ status: expect.any(Number) });
    }
    await expect(login('admin@example.com', 'wrongpass')).rejects.toMatchObject({ status: 423 });
    const user = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(user?.lockedUntil).not.toBeNull();
  });
});
