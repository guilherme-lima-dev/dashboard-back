import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditLevel, AuditStatus } from '../../modules/audit/dto';

export interface AuditOptions {
  action: AuditAction;
  resource: string;
  level?: AuditLevel;
  description?: string;
  includeRequest?: boolean;
  includeResponse?: boolean;
  includeUser?: boolean;
  includeMetadata?: boolean;
}

export const AUDIT_KEY = 'audit';

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);

// Predefined audit decorators for common actions
export const AuditCreate = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.CREATE,
    resource,
    level: AuditLevel.INFO,
    description: description || `Create ${resource}`,
  });

export const AuditRead = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.READ,
    resource,
    level: AuditLevel.INFO,
    description: description || `Read ${resource}`,
  });

export const AuditUpdate = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.UPDATE,
    resource,
    level: AuditLevel.INFO,
    description: description || `Update ${resource}`,
  });

export const AuditDelete = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.DELETE,
    resource,
    level: AuditLevel.WARNING,
    description: description || `Delete ${resource}`,
  });

export const AuditLogin = (description?: string) =>
  Audit({
    action: AuditAction.LOGIN,
    resource: 'user',
    level: AuditLevel.INFO,
    description: description || 'User login',
  });

export const AuditLogout = (description?: string) =>
  Audit({
    action: AuditAction.LOGOUT,
    resource: 'user',
    level: AuditLevel.INFO,
    description: description || 'User logout',
  });

export const AuditExport = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.EXPORT,
    resource,
    level: AuditLevel.INFO,
    description: description || `Export ${resource}`,
  });

export const AuditImport = (resource: string, description?: string) =>
  Audit({
    action: AuditAction.IMPORT,
    resource,
    level: AuditLevel.INFO,
    description: description || `Import ${resource}`,
  });

export const AuditWebhook = (platform: string, description?: string) =>
  Audit({
    action: AuditAction.WEBHOOK_RECEIVED,
    resource: 'webhook',
    level: AuditLevel.INFO,
    description: description || `Webhook received from ${platform}`,
  });

export const AuditCritical = (action: AuditAction, resource: string, description?: string) =>
  Audit({
    action,
    resource,
    level: AuditLevel.CRITICAL,
    description: description || `Critical action: ${action} on ${resource}`,
  });
