import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { Error as MongooseError } from 'mongoose';

/**
 * Global error format (TEAM_PLAN 3.10):
 * { statusCode, error, message: string[], path, timestamp }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, messages } = this.resolve(exception);

    response.status(statusCode).json({
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message: messages,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): {
    statusCode: number;
    messages: string[];
  } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;
      return {
        statusCode: exception.getStatus(),
        messages: this.toArray(message ?? exception.message),
      };
    }

    // Unique index violation (e.g. duplicate email) → 409
    if ((exception as { code?: number })?.code === 11000) {
      const keys = Object.keys(
        (exception as { keyValue?: object }).keyValue ?? {},
      );
      return {
        statusCode: HttpStatus.CONFLICT,
        messages: [`Duplicate value for: ${keys.join(', ') || 'unique field'}`],
      };
    }

    if (exception instanceof MongooseError.CastError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        messages: [`Invalid value for ${exception.path}`],
      };
    }

    if (exception instanceof MongooseError.ValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        messages: Object.values(exception.errors).map((e) => e.message),
      };
    }

    this.logger.error(exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      messages: ['Internal server error'],
    };
  }

  private toArray(message: string | string[]): string[] {
    return Array.isArray(message) ? message : [message];
  }
}
