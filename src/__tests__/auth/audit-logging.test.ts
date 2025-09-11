import { AuditLogService } from '@/lib/auth/AuditLogService';
import type { AuditLog, AuditAction, AuditLogFilter } from '@/types/audit';
import type { UserRole } from '@/types/user';

// Mock the Amplify client
jest.mock('aws-amplify/data');
jest.mock('@/lib/amplify');

describe('Audit Logging Tests', () => {
  let auditLogService: AuditLogService;
  let mockAuditLog: AuditLog;

  beforeEach(() => {
    auditLogService = new AuditLogService();
    
    mockAuditLog = {
      id: 'audit-123',
      action: 'ROLE_ASSIGNED' as AuditAction,
      performedBy: 'mod-123',
      targetUserId: 'user-123',
      fromRole: 'reader' as UserRole,
      toRole: 'writer' as UserRole,
      timestamp: '2025-01-01T12:00:00Z',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      metadata: {
        reason: 'User promotion request',
        requestedBy: 'supervisor-456'
      }
    };
  });

  describe('logRoleChange function', () => {
    it('should successfully log role assignment', async () => {
      const result = await auditLogService.logRoleChange({
        performedBy: 'mod-123',
        targetUserId: 'user-123',
        fromRole: 'reader' as UserRole,
        toRole: 'writer' as UserRole,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });

      expect(result.success).toBe(true);
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe('ROLE_ASSIGNED');
      expect(result.auditLog?.performedBy).toBe('mod-123');
      expect(result.auditLog?.targetUserId).toBe('user-123');
      expect(result.auditLog?.fromRole).toBe('reader');
      expect(result.auditLog?.toRole).toBe('writer');
    });

    it('should include IP address and user agent in log', async () => {
      const result = await auditLogService.logRoleChange({
        performedBy: 'mod-123',
        targetUserId: 'user-123',
        fromRole: 'reader' as UserRole,
        toRole: 'writer' as UserRole,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/91.0...'
      });

      expect(result.auditLog?.ipAddress).toBe('10.0.0.1');
      expect(result.auditLog?.userAgent).toBe('Chrome/91.0...');
    });

    it('should handle optional metadata', async () => {
      const result = await auditLogService.logRoleChange({
        performedBy: 'mod-123',
        targetUserId: 'user-123',
        fromRole: 'reader' as UserRole,
        toRole: 'writer' as UserRole,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          reason: 'Promotion for good performance',
          requestTicket: 'TICKET-789'
        }
      });

      expect(result.auditLog?.metadata).toBeDefined();
      expect(result.auditLog?.metadata?.reason).toBe('Promotion for good performance');
      expect(result.auditLog?.metadata?.requestTicket).toBe('TICKET-789');
    });
  });

  describe('logUserManagement function', () => {
    it('should log user deactivation', async () => {
      const result = await auditLogService.logUserManagement({
        action: 'USER_DEACTIVATED' as AuditAction,
        performedBy: 'mod-123',
        targetUserId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });

      expect(result.success).toBe(true);
      expect(result.auditLog?.action).toBe('USER_DEACTIVATED');
      expect(result.auditLog?.targetUserId).toBe('user-456');
    });

    it('should log user deletion', async () => {
      const result = await auditLogService.logUserManagement({
        action: 'USER_DELETED' as AuditAction,
        performedBy: 'mod-123',
        targetUserId: 'user-789',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          deletionType: 'hard',
          reason: 'Violation of terms'
        }
      });

      expect(result.auditLog?.action).toBe('USER_DELETED');
      expect(result.auditLog?.metadata?.deletionType).toBe('hard');
    });

    it('should log user reactivation', async () => {
      const result = await auditLogService.logUserManagement({
        action: 'USER_REACTIVATED' as AuditAction,
        performedBy: 'mod-123',
        targetUserId: 'user-101',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });

      expect(result.auditLog?.action).toBe('USER_REACTIVATED');
    });
  });

  describe('logPermissionChange function', () => {
    it('should log permission grants', async () => {
      const result = await auditLogService.logPermissionChange({
        action: 'PERMISSION_GRANTED' as AuditAction,
        performedBy: 'mod-123',
        targetUserId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          permission: 'ADMIN_ACCESS',
          temporary: true,
          expiresAt: '2025-12-31T23:59:59Z'
        }
      });

      expect(result.auditLog?.action).toBe('PERMISSION_GRANTED');
      expect(result.auditLog?.metadata?.permission).toBe('ADMIN_ACCESS');
      expect(result.auditLog?.metadata?.temporary).toBe(true);
    });

    it('should log permission revocations', async () => {
      const result = await auditLogService.logPermissionChange({
        action: 'PERMISSION_REVOKED' as AuditAction,
        performedBy: 'mod-123',
        targetUserId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          permission: 'MANAGE_USERS',
          reason: 'End of temporary assignment'
        }
      });

      expect(result.auditLog?.action).toBe('PERMISSION_REVOKED');
      expect(result.auditLog?.metadata?.permission).toBe('MANAGE_USERS');
    });
  });

  describe('getAuditLogs function', () => {
    it('should retrieve audit logs with pagination', async () => {
      const result = await auditLogService.getAuditLogs(1, 20);

      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should handle empty audit log results', async () => {
      const result = await auditLogService.getAuditLogs(1, 10);
      
      if (result.totalCount === 0) {
        expect(result.logs).toHaveLength(0);
      }
    });
  });

  describe('getAuditLogsByUser function', () => {
    it('should retrieve audit logs for specific user', async () => {
      const result = await auditLogService.getAuditLogsByUser('user-123', 1, 10);

      expect(result.logs).toBeDefined();
      result.logs.forEach(log => {
        expect(log.targetUserId).toBe('user-123');
      });
    });

    it('should return empty array for user with no audit logs', async () => {
      const result = await auditLogService.getAuditLogsByUser('new-user-999', 1, 10);

      expect(result.logs).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getAuditLogsByPerformer function', () => {
    it('should retrieve audit logs by performer', async () => {
      const result = await auditLogService.getAuditLogsByPerformer('mod-123', 1, 10);

      expect(result.logs).toBeDefined();
      result.logs.forEach(log => {
        expect(log.performedBy).toBe('mod-123');
      });
    });
  });

  describe('filterAuditLogs function', () => {
    it('should filter logs by action type', async () => {
      const filter: AuditLogFilter = {
        actions: ['ROLE_ASSIGNED', 'ROLE_REVOKED']
      };

      const result = await auditLogService.filterAuditLogs(filter, 1, 10);

      result.logs.forEach(log => {
        expect(['ROLE_ASSIGNED', 'ROLE_REVOKED']).toContain(log.action);
      });
    });

    it('should filter logs by date range', async () => {
      const filter: AuditLogFilter = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z'
      };

      const result = await auditLogService.filterAuditLogs(filter, 1, 10);

      result.logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(filter.startDate!);
        const endDate = new Date(filter.endDate!);
        
        expect(logDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter logs by performer', async () => {
      const filter: AuditLogFilter = {
        performedBy: 'mod-123'
      };

      const result = await auditLogService.filterAuditLogs(filter, 1, 10);

      result.logs.forEach(log => {
        expect(log.performedBy).toBe('mod-123');
      });
    });

    it('should filter logs by target user', async () => {
      const filter: AuditLogFilter = {
        targetUserId: 'user-123'
      };

      const result = await auditLogService.filterAuditLogs(filter, 1, 10);

      result.logs.forEach(log => {
        expect(log.targetUserId).toBe('user-123');
      });
    });

    it('should combine multiple filters', async () => {
      const filter: AuditLogFilter = {
        actions: ['ROLE_ASSIGNED'],
        performedBy: 'mod-123',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z'
      };

      const result = await auditLogService.filterAuditLogs(filter, 1, 10);

      result.logs.forEach(log => {
        expect(log.action).toBe('ROLE_ASSIGNED');
        expect(log.performedBy).toBe('mod-123');
        
        const logDate = new Date(log.timestamp);
        const startDate = new Date(filter.startDate!);
        const endDate = new Date(filter.endDate!);
        
        expect(logDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('deleteOldAuditLogs function', () => {
    it('should delete audit logs older than specified date', async () => {
      const cutoffDate = '2024-01-01T00:00:00Z';
      const result = await auditLogService.deleteOldAuditLogs(cutoffDate);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle case when no old logs exist', async () => {
      const cutoffDate = '2020-01-01T00:00:00Z';
      const result = await auditLogService.deleteOldAuditLogs(cutoffDate);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportAuditLogs function', () => {
    it('should export audit logs as CSV', async () => {
      const filter: AuditLogFilter = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z'
      };

      const result = await auditLogService.exportAuditLogs(filter, 'csv');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.filename).toContain('.csv');
    });

    it('should export audit logs as JSON', async () => {
      const filter: AuditLogFilter = {
        actions: ['ROLE_ASSIGNED']
      };

      const result = await auditLogService.exportAuditLogs(filter, 'json');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.filename).toContain('.json');
    });

    it('should handle export with no matching logs', async () => {
      const filter: AuditLogFilter = {
        startDate: '2020-01-01T00:00:00Z',
        endDate: '2020-01-02T00:00:00Z'
      };

      const result = await auditLogService.exportAuditLogs(filter, 'csv');

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
    });
  });

  describe('generateAuditReport function', () => {
    it('should generate comprehensive audit report', async () => {
      const filter: AuditLogFilter = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z'
      };

      const result = await auditLogService.generateAuditReport(filter);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.summary).toBeDefined();
      expect(result.report?.summary.totalActions).toBeGreaterThanOrEqual(0);
      expect(result.report?.summary.uniquePerformers).toBeGreaterThanOrEqual(0);
      expect(result.report?.summary.uniqueTargets).toBeGreaterThanOrEqual(0);
      expect(result.report?.actionBreakdown).toBeDefined();
      expect(result.report?.topPerformers).toBeDefined();
      expect(result.report?.timelineData).toBeDefined();
    });

    it('should handle report generation with no data', async () => {
      const filter: AuditLogFilter = {
        startDate: '2020-01-01T00:00:00Z',
        endDate: '2020-01-02T00:00:00Z'
      };

      const result = await auditLogService.generateAuditReport(filter);

      expect(result.success).toBe(true);
      expect(result.report?.summary.totalActions).toBe(0);
    });
  });
});