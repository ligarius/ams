import prisma, { resetDatabase } from '@/lib/prisma';

describe('Prisma UserModel', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('returns null when findUnique receives a non-numeric id', async () => {
    const result = await prisma.user.findUnique({ where: { id: Number('abc') } });
    expect(result).toBeNull();
  });
});
