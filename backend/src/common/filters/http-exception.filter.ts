import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? ((exceptionResponse as Record<string, unknown>).message as string) ?? 'An error occurred'
          : 'Internal server error';

    const error = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
    this.logger.error(`${request.method} ${request.url} ${status} — ${error}`);

    const body: ApiResponse<Record<string, never>> = {
      success: false,
      error,
      message: request.url,
      data: {},
    };

    response.status(status).json(body);
  }
}
