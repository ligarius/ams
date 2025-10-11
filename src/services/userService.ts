import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma, { User, UserRole } from '@/lib/prisma';

const userRoleEnum = z.enum(['ADMIN', 'CONSULTANT', 'CLIENT']);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleEnum,
});

const updateUserSchema = z.object({
  password: z.string().min(8).optional(),
  role: userRoleEnum.optional(),
});

export const listUsers = async (): Promise<Omit<User, 'passwordHash'>[]> => {
  const users = await prisma.user.findMany();
  return users.map(({ passwordHash: _passwordHash, ...rest }) => rest);
};

export const createUser = async (payload: unknown, actorId: number): Promise<Omit<User, 'passwordHash'>> => {
  const data = createUserSchema.parse(payload);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error('Email already registered');
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role as UserRole,
    },
  });
  await prisma.auditLog.create({ data: { userId: actorId, action: 'USER_CREATED', metadata: { targetUserId: user.id } } });
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
};

export const updateUser = async (userId: number, payload: unknown, actorId: number): Promise<Omit<User, 'passwordHash'>> => {
  const data = updateUserSchema.parse(payload);
  const updates: Partial<User> = {};
  if (data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (data.role) {
    updates.role = data.role as UserRole;
  }
  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }
  const updated = await prisma.user.update({ where: { id: userId }, data: updates });
  await prisma.auditLog.create({ data: { userId: actorId, action: 'USER_UPDATED', metadata: { targetUserId: userId } } });
  const { passwordHash: _passwordHash, ...rest } = updated;
  return rest;
};
