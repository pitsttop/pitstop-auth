import { authorize } from "../../src/middlewares/auth.middlewares";
import { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

import * as jwt from "jsonwebtoken";

describe("auth.middlewares", () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    mockRequest = {
      headers: {},
    };

    nextFunction = jest.fn();

    process.env.JWT_SECRET = "test-secret";
  });

  it("should return 401 when no Authorization header", () => {
    authorize([UserRole.CLIENT])(
      mockRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Token não fornecido." });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid", () => {
    mockRequest.headers.authorization = "Bearer invalid-token";
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authorize([UserRole.CLIENT])(
      mockRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Token inválido." });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 403 when role is insufficient", () => {
    mockRequest.headers.authorization = "Bearer valid-token";
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: "1",
      role: UserRole.CLIENT,
    });

    authorize([UserRole.ADMIN])(
      mockRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Acesso negado: permissão insuficiente.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should call next() and set user when token and role are valid", () => {
    mockRequest.headers.authorization = "Bearer valid-token";
    const decodedToken = { userId: "1", role: UserRole.CLIENT };
    (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

    authorize([UserRole.CLIENT])(
      mockRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-secret");
    expect(mockRequest.user).toEqual(decodedToken);
    expect(nextFunction).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("should allow access when user has one of multiple allowed roles", () => {
    mockRequest.headers.authorization = "Bearer valid-token";
    const decodedToken = { userId: "1", role: UserRole.ADMIN };
    (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

    authorize([UserRole.CLIENT, UserRole.ADMIN])(
      mockRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual(decodedToken);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
