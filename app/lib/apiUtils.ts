import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export class ApiResponse {
  static success(data: any, status: number = 200): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }, { 
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
  }

  static error(message: string, status: number = 500, code: string | null = null): NextResponse {
    const response: any = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    if (code) {
      response.code = code;
    }

    return NextResponse.json(response, { 
      status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  static unauthorized(message: string = "Unauthorized"): NextResponse {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = "Forbidden"): NextResponse {
    return this.error(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = "Resource not found"): NextResponse {
    return this.error(message, 404, 'NOT_FOUND');
  }

  static badRequest(message: string = "Bad request"): NextResponse {
    return this.error(message, 400, 'BAD_REQUEST');
  }

  static conflict(message: string = "Resource conflict"): NextResponse {
    return this.error(message, 409, 'CONFLICT');
  }

  static validationError(errors: any): NextResponse {
    return NextResponse.json({
      success: false,
      error: "Validation failed",
      validation_errors: errors,
      timestamp: new Date().toISOString()
    }, { 
      status: 422,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      console.error('API Error:', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return ApiResponse.validationError(error.errors);
      }

      if (error.name === 'CastError') {
        return ApiResponse.badRequest('Invalid ID format');
      }

      if (error.code === 11000) {
        return ApiResponse.conflict('Resource already exists');
      }

      // Default server error
      return ApiResponse.error(
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      );
    }
  };
}

/**
 * Request validator helper
 */
export class RequestValidator {
  static validateRequired(data: Record<string, any>, fields: string[]): string[] {
    const errors: string[] = [];
    
    for (const field of fields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field} is required`);
      }
    }
    
    return errors;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): string | null {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  }

  static validateUsername(username: string): string | null {
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      return 'Username can only contain letters, numbers, underscores (_), and dots (.)';
    }
    if (username.length < 2 || username.length > 30) {
      return 'Username must be between 2 and 30 characters';
    }
    return null;
  }
}
