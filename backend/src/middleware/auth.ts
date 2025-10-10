import { APIGatewayProxyEventV2, APIGatewayProxyResult, APIGatewayEventRequestContextV2 } from 'aws-lambda';
import { verifyToken } from '../auth';
import { UserRole } from '../types';

// Extend the request context to include our custom authorizer
declare module 'aws-lambda' {
  interface APIGatewayEventRequestContextV2 {
    authorizer?: {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      [key: string]: any;
    };
  }
}

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResult>;

export const requireAuth = (handler: Handler, roles: UserRole[] = []) => {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    try {
      const token = event.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: 'No token provided' }),
        };
      }

      const decoded = verifyToken(token);
      
      // Check if user has required role
      if (roles.length > 0 && !roles.includes(decoded.role as UserRole)) {
        return {
          statusCode: 403,
          body: JSON.stringify({ message: 'Insufficient permissions' }),
        };
      }

      // Create a new request context with the authorizer
      const contextWithAuth: APIGatewayEventRequestContextV2 = {
        ...event.requestContext,
        authorizer: {
          ...event.requestContext.authorizer,
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role as UserRole,
          },
        },
      };

      // Create a new event with the updated context
      const eventWithAuth: APIGatewayProxyEventV2 = {
        ...event,
        requestContext: contextWithAuth,
      };

      return handler(eventWithAuth);
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Invalid or expired token' }),
      };
    }
  };
};

export const requireAdmin = (handler: Handler) => requireAuth(handler, [UserRole.ADMIN]);
export const requireEditor = (handler: Handler) => requireAuth(handler, [UserRole.ADMIN, UserRole.EDITOR]);
export const requireAuthor = (handler: Handler) => 
  requireAuth(handler, [UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]);
