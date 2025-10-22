import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditAction, AuditLevel, AuditStatus, AlertType, AlertSeverity, AlertStatus } from './dto';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockAuditService = {
    createLog: jest.fn(),
    getLogs: jest.fn(),
    getLogById: jest.fn(),
    getStats: jest.fn(),
    createAlert: jest.fn(),
    getAlerts: jest.fn(),
    getAlertById: jest.fn(),
    updateAlertStatus: jest.fn(),
    cleanupOldLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
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

      mockAuditService.createLog.mockResolvedValue(mockAuditLog);

      const result = await controller.createLog(dto);

      expect(result).toEqual(mockAuditLog);
      expect(mockAuditService.createLog).toHaveBeenCalledWith(dto);
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

      const mockResult = {
        data: [
          {
            id: 'audit-1',
            userId: 'user-1',
            action: AuditAction.CREATE,
            resource: 'user',
            level: AuditLevel.INFO,
            status: AuditStatus.SUCCESS,
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      mockAuditService.getLogs.mockResolvedValue(mockResult);

      const result = await controller.getLogs(query);

      expect(result).toEqual(mockResult);
      expect(mockAuditService.getLogs).toHaveBeenCalledWith(query);
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
      };

      mockAuditService.getLogById.mockResolvedValue(mockLog);

      const result = await controller.getLogById(logId);

      expect(result).toEqual(mockLog);
      expect(mockAuditService.getLogById).toHaveBeenCalledWith(logId);
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        logsByLevel: {
          info: 80,
          warning: 15,
          error: 4,
          critical: 1,
        },
        logsByStatus: {
          success: 95,
          failed: 5,
          pending: 0,
        },
        topActions: [
          { action: 'create', count: 30 },
          { action: 'read', count: 25 },
          { action: 'update', count: 20 },
        ],
        topUsers: [
          { userId: 'user-1', userName: 'User 1', count: 50 },
          { userId: 'user-2', userName: 'User 2', count: 30 },
        ],
        recentCriticalEvents: [],
      };

      mockAuditService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockAuditService.getStats).toHaveBeenCalled();
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

      mockAuditService.createAlert.mockResolvedValue(mockAlert);

      const result = await controller.createAlert(dto);

      expect(result).toEqual(mockAlert);
      expect(mockAuditService.createAlert).toHaveBeenCalledWith(dto);
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

      const mockResult = {
        data: [
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
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      mockAuditService.getAlerts.mockResolvedValue(mockResult);

      const result = await controller.getAlerts(query);

      expect(result).toEqual(mockResult);
      expect(mockAuditService.getAlerts).toHaveBeenCalledWith(query);
    });
  });

  describe('getAlertById', () => {
    it('should return audit alert by ID', async () => {
      const alertId = 'alert-1';
      const mockAlert = {
        id: alertId,
        type: AlertType.CRITICAL_EVENT,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Critical Event',
        description: 'A critical event occurred',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuditService.getAlertById.mockResolvedValue(mockAlert);

      const result = await controller.getAlertById(alertId);

      expect(result).toEqual(mockAlert);
      expect(mockAuditService.getAlertById).toHaveBeenCalledWith(alertId);
    });
  });

  describe('updateAlertStatus', () => {
    it('should update alert status', async () => {
      const alertId = 'alert-1';
      const dto = {
        action: 'acknowledge' as const,
        comment: 'Acknowledged by admin',
      };

      const mockAlert = {
        id: alertId,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'user-1',
        acknowledgedAt: new Date(),
      };

      mockAuditService.updateAlertStatus.mockResolvedValue(mockAlert);

      const result = await controller.updateAlertStatus(alertId, dto);

      expect(result).toEqual(mockAlert);
      expect(mockAuditService.updateAlertStatus).toHaveBeenCalledWith(
        alertId,
        dto,
        'current-user-id',
      );
    });
  });

  describe('cleanupOldLogs', () => {
    it('should clean up old audit logs', async () => {
      const days = '90';
      const deletedCount = 5;

      mockAuditService.cleanupOldLogs.mockResolvedValue(deletedCount);

      const result = await controller.cleanupOldLogs(days);

      expect(result).toEqual({
        message: `Cleaned up ${deletedCount} old audit logs`,
        deletedCount,
        daysToKeep: 90,
      });
      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });

    it('should use default days if not provided', async () => {
      const deletedCount = 10;

      mockAuditService.cleanupOldLogs.mockResolvedValue(deletedCount);

      const result = await controller.cleanupOldLogs();

      expect(result).toEqual({
        message: `Cleaned up ${deletedCount} old audit logs`,
        deletedCount,
        daysToKeep: 90,
      });
      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });
  });
});
