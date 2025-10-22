import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuditAction, AuditLevel, AuditStatus } from '../../modules/audit/dto';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(AUDIT_KEY, context.getHandler());
    
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    const userId = request.user?.id || 'system';
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async (data) => {
        const executionTime = Date.now() - startTime;
        
        try {
          await this.auditService.createLog({
            userId,
            action: auditOptions.action,
            resource: auditOptions.resource,
            resourceId: this.extractResourceId(request, data),
            description: auditOptions.description,
            level: auditOptions.level || AuditLevel.INFO,
            status: AuditStatus.SUCCESS,
            ipAddress,
            userAgent,
            metadata: this.buildMetadata(request, data, auditOptions),
            executionTime,
          });
        } catch (error) {
          this.logger.error('Failed to create audit log:', error);
        }
      }),
      catchError(async (error) => {
        const executionTime = Date.now() - startTime;
        
        try {
          await this.auditService.createLog({
            userId,
            action: auditOptions.action,
            resource: auditOptions.resource,
            resourceId: this.extractResourceId(request, null),
            description: auditOptions.description,
            level: auditOptions.level || AuditLevel.ERROR,
            status: AuditStatus.FAILED,
            ipAddress,
            userAgent,
            metadata: this.buildMetadata(request, null, auditOptions),
            errorMessage: error.message,
            executionTime,
          });
        } catch (auditError) {
          this.logger.error('Failed to create audit log for error:', auditError);
        }

        throw error;
      }),
    );
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private extractResourceId(request: any, data: any): string | undefined {
    // Try to extract resource ID from various sources
    if (request.params?.id) {
      return request.params.id;
    }
    
    if (data?.id) {
      return data.id;
    }
    
    if (data?.data?.id) {
      return data.data.id;
    }

    // For webhook events, try to extract from body
    if (request.body?.id) {
      return request.body.id;
    }

    return undefined;
  }

  private buildMetadata(request: any, data: any, options: AuditOptions): Record<string, any> {
    const metadata: Record<string, any> = {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    };

    if (options.includeRequest) {
      metadata.request = {
        body: this.sanitizeRequestData(request.body),
        query: request.query,
        params: request.params,
      };
    }

    if (options.includeResponse && data) {
      metadata.response = this.sanitizeResponseData(data);
    }

    if (options.includeUser && request.user) {
      metadata.user = {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
      };
    }

    if (options.includeMetadata) {
      metadata.additional = {
        headers: this.sanitizeHeaders(request.headers),
        userAgent: request.headers['user-agent'],
        referer: request.headers.referer,
      };
    }

    return metadata;
  }

  private sanitizeRequestData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data;

    // For large responses, only include summary
    if (typeof data === 'object' && data.data && Array.isArray(data.data)) {
      return {
        ...data,
        data: `[${data.data.length} items]`,
        pagination: data.pagination,
      };
    }

    return data;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
