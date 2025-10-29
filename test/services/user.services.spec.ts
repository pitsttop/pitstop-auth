import { createUser, loginUser } from '../../src/services/user.services';

jest.mock('@prisma/client', () => {
  const mCreate = jest.fn();
  const mFindUnique = jest.fn();
  return {
    PrismaClient: jest.fn(() => ({ user: { create: mCreate, findUnique: mFindUnique } })),
    UserRole: { ADMIN: 'ADMIN', CLIENT: 'CLIENT' },
    __mocked: { mCreate, mFindUnique },
  };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// obtain references to the mocked functions exported by the mocked module
const { __mocked } = require('@prisma/client');
const mCreate: jest.Mock = __mocked.mCreate;
const mFindUnique: jest.Mock = __mocked.mFindUnique;

describe('user.services (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('createUser', () => {
    it('should hash password and create user', async () => {
      // Arrange
      const input = { name: 'John', email: 'john@example.com', password: 'plain' };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      const created = { id: '1', name: 'John', email: 'john@example.com', password: 'hashed', role: 'CLIENT', createdAt: new Date() };
      mCreate.mockResolvedValue(created);

      // Act
      const res = await createUser(input as any);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
      expect(mCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'john@example.com', name: 'John', password: 'hashed' }) });
      expect(res).toEqual(created);
    });
  });

  describe('loginUser', () => {
    it('should throw when user not found', async () => {
      (mFindUnique as jest.Mock).mockResolvedValue(null);
      await expect(loginUser({ email: 'noone@example.com', password: 'x' })).rejects.toThrow('Credenciais inválidas');
    });

    it('should throw when password invalid', async () => {
      const user = { id: '1', email: 'a@b.com', password: 'hashedpw', role: 'CLIENT' };
      (mFindUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(loginUser({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
    });

    it('should return token when credentials valid', async () => {
      const user = { id: '1', email: 'a@b.com', password: 'hashedpw', role: 'CLIENT' };
      (mFindUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('tok');

      const res = await loginUser({ email: 'a@b.com', password: 'right' });

      expect(bcrypt.compare).toHaveBeenCalledWith('right', 'hashedpw');
      expect(jwt.sign).toHaveBeenCalledWith({ userId: '1', role: 'CLIENT' }, 'test-secret', { expiresIn: '8h' });
      expect(res).toEqual({ token: 'tok' });
    });
  });
});
