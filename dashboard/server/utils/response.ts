import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

/**
 * Configuration for sensitive fields that should be sanitized from responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authToken',
  'apiKey',
  'secret',
  'secretKey',
  'privateKey',
  'hash',
  'salt',
  'sessionId',
  'csrf',
  'csrfToken',
  'jwt',
  'bearer',
  'authorization'
];

/**
 * Recursively sanitize sensitive fields from data
 */
function sanitizeData(data: any, visited = new WeakSet()): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Prevent circular references
  if (visited.has(data)) {
    return '[Circular Reference]';
  }
  visited.add(data);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, visited));
  }

  // Handle objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if the field name is sensitive (case-insensitive)
    const isSensitive = SENSITIVE_FIELDS.some(
      sensitiveField => key.toLowerCase().includes(sensitiveField.toLowerCase())
    );

    if (isSensitive) {
      // Replace sensitive data with a placeholder
      sanitized[key] = '[REDACTED]';
    } else {
      // Recursively sanitize nested objects/arrays
      sanitized[key] = sanitizeData(value, visited);
    }
  }

  return sanitized;
}

export class ResponseUtil {
  /**
   * Send success response with automatic sanitization
   */
  static success<T>(res: Response, data?: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data: data ? sanitizeData(data) as T : data,
      message,
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send success response with pagination meta and automatic sanitization
   */
  static successWithMeta<T>(
    res: Response, 
    data: T[], 
    meta: ApiResponse['meta'], 
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data: sanitizeData(data) as T[],
      message,
      meta,
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response with automatic sanitization
   */
  static error(res: Response, error: string, statusCode: number = 400, data?: any): Response {
    const response: ApiResponse = {
      success: false,
      error: sanitizeData(error) as string,
      data: data ? sanitizeData(data) : undefined,
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response with automatic sanitization
   */
  static validationError(res: Response, errors: Record<string, string[]>): Response {
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      errors: sanitizeData(errors) as Record<string, string[]>,
    };
    
    return res.status(422).json(response);
  }

  /**
   * Send not found response with automatic sanitization
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response {
    const response: ApiResponse = {
      success: false,
      error: sanitizeData(message) as string,
    };
    
    return res.status(404).json(response);
  }

  /**
   * Send unauthorized response with automatic sanitization
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    const response: ApiResponse = {
      success: false,
      error: sanitizeData(message) as string,
    };
    
    return res.status(401).json(response);
  }

  /**
   * Send forbidden response with automatic sanitization
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    const response: ApiResponse = {
      success: false,
      error: sanitizeData(message) as string,
    };
    
    return res.status(403).json(response);
  }

  /**
   * Send internal server error response with automatic sanitization
   */
  static serverError(res: Response, message: string = 'Internal server error'): Response {
    const response: ApiResponse = {
      success: false,
      error: sanitizeData(message) as string,
    };
    
    return res.status(500).json(response);
  }

  /**
   * Handle async controller errors with automatic sanitization
   */
  static handleAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('Controller error:', error);
        // Sanitize error message to prevent sensitive data leakage
        const sanitizedMessage = sanitizeData(error.message || 'Internal server error') as string;
        ResponseUtil.serverError(res, sanitizedMessage);
      });
    };
  }

  /**
   * Manually sanitize data (for custom usage)
   */
  static sanitize<T>(data: T): T {
    return sanitizeData(data) as T;
  }

  /**
   * Add custom sensitive field to the sanitization list
   */
  static addSensitiveField(fieldName: string): void {
    if (!SENSITIVE_FIELDS.includes(fieldName.toLowerCase())) {
      SENSITIVE_FIELDS.push(fieldName.toLowerCase());
    }
  }

  /**
   * Get current list of sensitive fields
   */
  static getSensitiveFields(): string[] {
    return [...SENSITIVE_FIELDS];
  }
}