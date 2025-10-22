import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreateAuditLogDto, 
  AuditQueryDto, 
  AuditStatsDto, 
  AuditLogDto,
  CreateAuditAlertDto,
  AlertQueryDto,
  AuditAlertDto,
  AlertActionDto,
  AuditAction,
  AuditLevel,
  AuditStatus,
  AlertType,
  AlertSeverity,
  AlertStatus
} from './dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(dto: CreateAuditLogDto): Promise<AuditLogDto> {
    this.logger.log(`Creating audit log: ${dto.action} on ${dto.resource}`);

    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId,
        description: dto.description,
        level: dto.level,
        status: dto.status,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        metadata: dto.metadata,
        errorMessage: dto.errorMessage,
        executionTime: dto.executionTime,
      },
    });

    // Check if we need to create an alert
    await this.checkAndCreateAlert(auditLog);

    this.logger.log(`Audit log created: ${auditLog.id}`);
    return auditLog as AuditLogDto;
  }

  async getLogs(query: AuditQueryDto) {
    const { 
      userId, 
      action, 
      resource, 
      level, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = query;
    
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (level) {
      where.level = level;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(id: string): Promise<AuditLogDto> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error(`Audit log with ID ${id} not found`);
    }

    return log as AuditLogDto;
  }

  async getStats(): Promise<AuditStatsDto> {
    const [
      totalLogs,
      logsByLevel,
      logsByStatus,
      topActions,
      topUsers,
      recentCriticalEvents,
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.getLogsByLevel(),
      this.getLogsByStatus(),
      this.getTopActions(),
      this.getTopUsers(),
      this.getRecentCriticalEvents(),
    ]);

    return {
      totalLogs,
      logsByLevel,
      logsByStatus,
      topActions,
      topUsers,
      recentCriticalEvents,
    };
  }

  async createAlert(dto: CreateAuditAlertDto): Promise<AuditAlertDto> {
    this.logger.log(`Creating audit alert: ${dto.type} - ${dto.title}`);

    const alert = await this.prisma.auditAlert.create({
      data: {
        type: dto.type,
        severity: dto.severity,
        status: AlertStatus.ACTIVE,
        title: dto.title,
        description: dto.description,
        resource: dto.resource,
        resourceId: dto.resourceId,
        metadata: dto.metadata,
        isActive: dto.isActive ?? true,
      },
    });

    // Send notification if alert is active
    if (alert.isActive) {
      await this.sendAlertNotification(alert);
    }

    this.logger.log(`Audit alert created: ${alert.id}`);
    return alert as AuditAlertDto;
  }

  async getAlerts(query: AlertQueryDto) {
    const { 
      type, 
      severity, 
      status, 
      isActive, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = query;
    
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [alerts, total] = await Promise.all([
      this.prisma.auditAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          acknowledgedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          resolvedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditAlert.count({ where }),
    ]);

    return {
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateAlertStatus(alertId: string, dto: AlertActionDto, userId: string): Promise<AuditAlertDto> {
    this.logger.log(`Updating alert status: ${alertId} - ${dto.action}`);

    const updateData: any = {
      updatedAt: new Date(),
    };

    switch (dto.action) {
      case 'acknowledge':
        updateData.status = AlertStatus.ACKNOWLEDGED;
        updateData.acknowledgedBy = userId;
        updateData.acknowledgedAt = new Date();
        break;
      case 'resolve':
        updateData.status = AlertStatus.RESOLVED;
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
        updateData.isActive = false;
        break;
      case 'dismiss':
        updateData.status = AlertStatus.DISMISSED;
        updateData.isActive = false;
        break;
    }

    if (dto.comment) {
      updateData.metadata = {
        ...updateData.metadata,
        comment: dto.comment,
      };
    }

    const alert = await this.prisma.auditAlert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        acknowledgedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        resolvedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Alert status updated: ${alertId} - ${dto.action}`);
    return alert as AuditAlertDto;
  }

  async getAlertById(id: string): Promise<AuditAlertDto> {
    const alert = await this.prisma.auditAlert.findUnique({
      where: { id },
      include: {
        acknowledgedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        resolvedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!alert) {
      throw new Error(`Audit alert with ID ${id} not found`);
    }

    return alert as AuditAlertDto;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    this.logger.log(`Cleaning up audit logs older than ${daysToKeep} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        level: {
          in: [AuditLevel.INFO, AuditLevel.WARNING],
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old audit logs`);
    return result.count;
  }

  private async checkAndCreateAlert(auditLog: any): Promise<void> {
    // Check for critical events
    if (auditLog.level === AuditLevel.CRITICAL) {
      await this.createAlert({
        type: AlertType.CRITICAL_EVENT,
        severity: AlertSeverity.CRITICAL,
        title: `Critical Event: ${auditLog.action}`,
        description: `Critical event detected: ${auditLog.description || auditLog.action} on ${auditLog.resource}`,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        metadata: {
          auditLogId: auditLog.id,
          userId: auditLog.userId,
          action: auditLog.action,
        },
      });
    }

    // Check for failed operations
    if (auditLog.status === AuditStatus.FAILED) {
      await this.createAlert({
        type: AlertType.SYSTEM_ERROR,
        severity: auditLog.level === AuditLevel.ERROR ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        title: `Failed Operation: ${auditLog.action}`,
        description: `Operation failed: ${auditLog.errorMessage || auditLog.description}`,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        metadata: {
          auditLogId: auditLog.id,
          userId: auditLog.userId,
          action: auditLog.action,
          errorMessage: auditLog.errorMessage,
        },
      });
    }

    // Check for suspicious activity patterns
    await this.checkSuspiciousActivity(auditLog);
  }

  private async checkSuspiciousActivity(auditLog: any): Promise<void> {
    // Check for multiple failed login attempts
    if (auditLog.action === AuditAction.LOGIN && auditLog.status === AuditStatus.FAILED) {
      const recentFailedLogins = await this.prisma.auditLog.count({
        where: {
          userId: auditLog.userId,
          action: AuditAction.LOGIN,
          status: AuditStatus.FAILED,
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          },
        },
      });

      if (recentFailedLogins >= 5) {
        await this.createAlert({
          type: AlertType.FAILED_LOGIN_ATTEMPTS,
          severity: AlertSeverity.HIGH,
          title: 'Multiple Failed Login Attempts',
          description: `User ${auditLog.userId} has ${recentFailedLogins} failed login attempts in the last 15 minutes`,
          resource: 'user',
          resourceId: auditLog.userId,
          metadata: {
            userId: auditLog.userId,
            failedAttempts: recentFailedLogins,
            timeWindow: '15 minutes',
          },
        });
      }
    }
  }

  private async sendAlertNotification(alert: any): Promise<void> {
    // This would integrate with notification services like Slack, Email, etc.
    this.logger.warn(`ALERT: ${alert.severity.toUpperCase()} - ${alert.title}`);
    this.logger.warn(`Description: ${alert.description}`);
    
    if (alert.metadata) {
      this.logger.warn(`Metadata: ${JSON.stringify(alert.metadata)}`);
    }
  }

  private async getLogsByLevel() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['level'],
      _count: {
        level: true,
      },
    });

    const levels = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    result.forEach(item => {
      levels[item.level as keyof typeof levels] = item._count.level;
    });

    return levels;
  }

  private async getLogsByStatus() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const statuses = {
      success: 0,
      failed: 0,
      pending: 0,
    };

    result.forEach(item => {
      statuses[item.status as keyof typeof statuses] = item._count.status;
    });

    return statuses;
  }

  private async getTopActions() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 10,
    });

    return result.map(item => ({
      action: item.action,
      count: item._count.action,
    }));
  }

  private async getTopUsers() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 10,
    });

    // Get user names
    const userIds = result.map(item => item.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map(user => [user.id, user]));

    return result.map(item => ({
      userId: item.userId,
      userName: userMap.get(item.userId)?.fullName,
      count: item._count.userId,
    }));
  }

  private async getRecentCriticalEvents(): Promise<AuditLogDto[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        level: AuditLevel.CRITICAL,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    
    return logs as AuditLogDto[];
  }
}