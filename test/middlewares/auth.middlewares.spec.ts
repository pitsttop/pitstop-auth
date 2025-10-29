import { authorize } from '../../src/middlewares/auth.middlewares';
import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import * as jwt from 'jsonwebtoken';

describe('auth.middlewares', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock response methods
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Mock request
    mockRequest = {
      headers: {},
    };

    // Mock next function
    nextFunction = jest.fn();

    // Ensure JWT_SECRET is set for tests
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should return 401 when no Authorization header', () => {
    // Act
    authorize([UserRole.CLIENT])(mockRequest, mockResponse as Response, nextFunction);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Token não fornecido.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    // Arrange
    mockRequest.headers.authorization = 'Bearer invalid-token';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    // Act
    authorize([UserRole.CLIENT])(mockRequest, mockResponse as Response, nextFunction);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Token inválido.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 when role is insufficient', () => {
    // Arrange
    mockRequest.headers.authorization = 'Bearer valid-token';
    (jwt.verify as jest.Mock).mockReturnValue({ userId: '1', role: UserRole.CLIENT });

    // Act
    authorize([UserRole.ADMIN])(mockRequest, mockResponse as Response, nextFunction);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Acesso negado: permissão insuficiente.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() and set user when token and role are valid', () => {
    // Arrange
    mockRequest.headers.authorization = 'Bearer valid-token';
    const decodedToken = { userId: '1', role: UserRole.CLIENT };
    (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

    // Act
    authorize([UserRole.CLIENT])(mockRequest, mockResponse as Response, nextFunction);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(mockRequest.user).toEqual(decodedToken);
    expect(nextFunction).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should allow access when user has one of multiple allowed roles', () => {
    // Arrange
    mockRequest.headers.authorization = 'Bearer valid-token';
    const decodedToken = { userId: '1', role: UserRole.ADMIN };
    (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

    // Act
    authorize([UserRole.CLIENT, UserRole.ADMIN])(mockRequest, mockResponse as Response, nextFunction);

    // Assert
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual(decodedToken);
    expect(statusMock).not.toHaveBeenCalled();
  });
});