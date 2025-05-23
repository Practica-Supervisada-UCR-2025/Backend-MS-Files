// Mock setup must be before imports
jest.mock('../../src/features/uploads/services/jwt.service');

import { Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../../src/features/uploads/middleware/authenticate.middleware';
import { JwtService } from '../../src/features/uploads/services/jwt.service';
import { UnauthorizedError } from '../../src/utils/errors/api-error';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {}
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateJWT', () => {
    it('should throw UnauthorizedError when no token provided', () => {
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('No token provided');
    });

    it('should throw UnauthorizedError when token format is invalid', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid token format');
    });

    it('should throw UnauthorizedError when token is empty', () => {
      mockRequest.headers = { authorization: 'Bearer ' };

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid token format');
    });

    it('should set user role to admin when token is valid with admin role', () => {
      mockRequest.headers = { authorization: 'Bearer validToken' };
      const mockDecodedToken = { role: 'admin', email: 'example@ucr.ac.cr', uuid: '123456789101' };
      
      (JwtService.prototype.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect((mockRequest as any).user.role).toBe('admin');
    });

    it('should set user role to user when token is valid with non-admin role', () => {
      mockRequest.headers = { authorization: 'Bearer validToken' };
      const mockDecodedToken = { role: 'user', email: 'example@ucr.ac.cr', uuid: '123456789101' };
      
      (JwtService.prototype.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect((mockRequest as any).user.role).toBe('user');
    });

    it('should throw UnauthorizedError when token is valid but missing email', () => {
      mockRequest.headers = { authorization: 'Bearer validToken' };
      const mockDecodedToken = { role: 'user', uuid: '123456789101' }; // no email

      (JwtService.prototype.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Unauthorized');
      expect(error.details).toEqual(['Not registered user']);
    });
  });

  
});