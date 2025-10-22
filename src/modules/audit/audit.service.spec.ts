import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, AuditLevel, AuditStatus, AlertType, AlertSeverity, AlertStatus } from './dto';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog', () => {
    it('should create an audit log', async () => {
      const dto = {
        userId: 'user-1',
        action: AuditAction.CREATE,
        resource: 'user',
        resourceId: 'user-123',
        description: 'User created',
        level: AuditLevel.INFO,
        status: AuditStatus.SUCCESS,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { test: 'data' },
        executionTime: 100,
      };

      const mockAuditLog = {
        id: 'audit-1',
        ...dto,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.createLog(dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: dto,
      });
    });

    it('should create alert for critical events', async () => {
      const dto = {
        userId: 'user-1',
        action: AuditAction.DELETE,
        resource: 'user',
        level: AuditLevel.CRITICAL,
        status: AuditStatus.SUCCESS,
      };

      const mockAuditLog = {
        id: 'audit-1',
        ...dto,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);
      mockPrismaService.auditAlert.create.mockResolvedValue({});

      await service.createLog(dto);

      expect(mockPrismaService.auditAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.CRITICAL_EVENT,
          severity: AlertSeverity.CRITICAL,
        }),
      });
    });
  });

  describe('getLogs', () => {
    it('should return paginated audit logs', async () => {
      const query = {
        page: 1,
        limit: 10,
        userId: 'user-1',
        action: AuditAction.CREATE,
      };

      const mockLogs = [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: AuditAction.CREATE,
          resource: 'user',
          level: AuditLevel.INFO,
          status: AuditStatus.SUCCESS,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            fullName: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getLogs(query);

      expect(result.data).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should apply filters correctly', async () => {
      const query = {
        userId: 'user-1',
        action: AuditAction.CREATE,
        resource: 'user',
        level: AuditLevel.INFO,
        status: AuditStatus.SUCCESS,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getLogs(query);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          action: AuditAction.CREATE,
          resource: 'user',
          level: AuditLevel.INFO,
          status: AuditStatus.SUCCESS,
          createdAt: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
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
    });
  });

  describe('getLogById', () => {
    it('should return audit log by ID', async () => {
      const logId = 'audit-1';
      const mockLog = {
        id: logId,
        userId: 'user-1',
        action: AuditAction.CREATE,
        resource: 'user',
        level: AuditLevel.INFO,
        status: AuditStatus.SUCCESS,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          fullName: 'Test User',
          email: 'test@example.com',
        },
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.getLogById(logId);

      expect(result).toEqual(mockLog);
      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: logId },
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
    });

    it('should throw error when log not found', async () => {
      const logId = 'non-existent';

      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.getLogById(logId)).rejects.toThrow(
        `Audit log with ID ${logId} not found`,
      );
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      const mockStats = {
        _sum: { totalRevenueBrl: 1000 },
      };

      const mockLevels = [
        { level: 'info', _count: { level: 10 } },
        { level: 'warning', _count: { level: 5 } },
        { level: 'error', _count: { level: 2 } },
        { level: 'critical', _count: { level: 1 } },
      ];

      const mockStatuses = [
        { status: 'success', _count: { status: 15 } },
        { status: 'failed', _count: { status: 3 } },
        { status: 'pending', _count: { status: 0 } },
      ];

      const mockActions = [
        { action: 'create', _count: { action: 8 } },
        { action: 'read', _count: { action: 5 } },
        { action: 'update', _count: { action: 3 } },
      ];

      const mockUsers = [
        { userId: 'user-1', _count: { userId: 10 } },
        { userId: 'user-2', _count: { userId: 5 } },
      ];

      mockPrismaService.auditLog.count.mockResolvedValue(18);
      mockPrismaService.auditLog.groupBy
        .mockResolvedValueOnce(mockLevels)
        .mockResolvedValueOnce(mockStatuses)
        .mockResolvedValueOnce(mockActions);
      mockPrismaService.auditLog.groupBy.mockResolvedValueOnce(mockUsers);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', fullName: 'User 1', email: 'user1@example.com' },
        { id: 'user-2', fullName: 'User 2', email: 'user2@example.com' },
      ]);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalLogs: 18,
        logsByLevel: {
          info: 10,
          warning: 5,
          error: 2,
          critical: 1,
        },
        logsByStatus: {
          success: 15,
          failed: 3,
          pending: 0,
        },
        topActions: [
          { action: 'create', count: 8 },
          { action: 'read', count: 5 },
          { action: 'update', count: 3 },
        ],
        topUsers: [
          { userId: 'user-1', userName: 'User 1', count: 10 },
          { userId: 'user-2', userName: 'User 2', count: 5 },
        ],
        recentCriticalEvents: [],
      });
    });
  });

  describe('createAlert', () => {
    it('should create an audit alert', async () => {
      const dto = {
        type: AlertType.CRITICAL_EVENT,
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Event',
        description: 'A critical event occurred',
        resource: 'user',
        resourceId: 'user-123',
        metadata: { test: 'data' },
      };

      const mockAlert = {
        id: 'alert-1',
        ...dto,
        status: AlertStatus.ACTIVE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.auditAlert.create.mockResolvedValue(mockAlert);

      const result = await service.createAlert(dto);

      expect(result).toBeDefined();
      expect(mockPrismaService.auditAlert.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          status: AlertStatus.ACTIVE,
          isActive: true,
        },
      });
    });
  });

  describe('getAlerts', () => {
    it('should return paginated audit alerts', async () => {
      const query = {
        page: 1,
        limit: 10,
        type: AlertType.CRITICAL_EVENT,
        severity: AlertSeverity.CRITICAL,
      };

      const mockAlerts = [
        {
          id: 'alert-1',
          type: AlertType.CRITICAL_EVENT,
          severity: AlertSeverity.CRITICAL,
          status: AlertStatus.ACTIVE,
          title: 'Critical Event',
          description: 'A critical event occurred',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.auditAlert.findMany.mockResolvedValue(mockAlerts);
      mockPrismaService.auditAlert.count.mockResolvedValue(1);

      const result = await service.getAlerts(query);

      expect(result.data).toEqual(mockAlerts);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateAlertStatus', () => {
    it('should acknowledge an alert', async () => {
      const alertId = 'alert-1';
      const dto = {
        action: 'acknowledge' as const,
        comment: 'Acknowledged by admin',
      };
      const userId = 'user-1';

      const mockAlert = {
        id: alertId,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      };

      mockPrismaService.auditAlert.update.mockResolvedValue(mockAlert);

      const result = await service.updateAlertStatus(alertId, dto, userId);

      expect(result).toEqual(mockAlert);
      expect(mockPrismaService.auditAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: userId,
          acknowledgedAt: expect.any(Date),
          updatedAt: expect.any(Date),
          metadata: {
            comment: 'Acknowledged by admin',
          },
        },
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
    });

    it('should resolve an alert', async () => {
      const alertId = 'alert-1';
      const dto = {
        action: 'resolve' as const,
        comment: 'Issue resolved',
      };
      const userId = 'user-1';

      const mockAlert = {
        id: alertId,
        status: AlertStatus.RESOLVED,
        resolvedBy: userId,
        resolvedAt: new Date(),
        isActive: false,
      };

      mockPrismaService.auditAlert.update.mockResolvedValue(mockAlert);

      const result = await service.updateAlertStatus(alertId, dto, userId);

      expect(result).toEqual(mockAlert);
      expect(mockPrismaService.auditAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedBy: userId,
          resolvedAt: expect.any(Date),
          isActive: false,
          updatedAt: expect.any(Date),
          metadata: {
            comment: 'Issue resolved',
          },
        },
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
    });
  });

  describe('cleanupOldLogs', () => {
    it('should clean up old audit logs', async () => {
      const daysToKeep = 90;
      const mockResult = { count: 5 };

      mockPrismaService.auditLog.deleteMany.mockResolvedValue(mockResult);

      const result = await service.cleanupOldLogs(daysToKeep);

      expect(result).toBe(5);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
          level: {
            in: [AuditLevel.INFO, AuditLevel.WARNING],
          },
        },
      });
    });
  });
});
