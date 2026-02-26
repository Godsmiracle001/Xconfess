import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let message = 'An unexpected error occurred';
        let code = this.getErrorCode(status);

        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const resObj = exceptionResponse as any;

            // Handle validation errors (arrays) from ValidationPipe
            if (Array.isArray(resObj.message)) {
                message = resObj.message[0];
            } else if (resObj.message) {
                message = resObj.message;
            }

            if (resObj.code) {
                code = resObj.code;
            }
        }

        response.status(status).json({
            status,
            message,
            code,
            timestamp: new Date().toISOString(),
            requestId: (request as any).requestId || 'unknown',
        });
    }

    private getErrorCode(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case HttpStatus.CONFLICT:
                return 'CONFLICT';
            case HttpStatus.TOO_MANY_REQUESTS:
                return 'THROTTLED';
            case HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_SERVER_ERROR';
            default:
                return 'ERROR';
        }
    }
}
