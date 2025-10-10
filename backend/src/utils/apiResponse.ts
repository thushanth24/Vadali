import { APIGatewayProxyResult } from 'aws-lambda';

export const success = (data: any, statusCode = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(data),
});

export const error = (message: string, statusCode = 400): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({ error: message }),
});

export const notFound = (message = 'Resource not found'): APIGatewayProxyResult => 
  error(message, 404);

export const unauthorized = (message = 'Unauthorized'): APIGatewayProxyResult =>
  error(message, 401);

export const forbidden = (message = 'Forbidden'): APIGatewayProxyResult =>
  error(message, 403);

export const parseBody = <T = any>(body: string | null | undefined): T => {
  try {
    return body ? JSON.parse(body) : ({} as T);
  } catch (e) {
    return {} as T;
  }
};
