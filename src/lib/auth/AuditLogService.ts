import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import type {
  AuditLog,
  AuditAction,
  AuditLogFilter,
  AuditLogResult,
  AuditLogListResult,
  AuditLogDeleteResult,
  AuditLogExportResult,
  AuditReportResult,
  RoleChangeAuditInput,
  UserManagementAuditInput,
  PermissionChangeAuditInput,
  CreateAuditLogInput
} from '@/types/audit';

const client = generateClient<Schema>();

export class AuditLogService {
  /**
   * Create a general audit log entry
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLogResult> {
    try {
      const { data: auditLog, errors } = await client.models.AuditLog.create({
        action: input.action,
        performedBy: input.performedBy,
        targetUserId: input.targetUserId,
        fromRole: input.fromRole,
        toRole: input.toRole,
        timestamp: new Date().toISOString(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        success: input.success ?? true,
        errorMessage: input.errorMessage
      });

      if (errors || !auditLog) {
        return {
          success: false,
          error: 'AUDIT_LOG_CREATION_FAILED'
        };
      }

      return {
        success: true,
        auditLog: {
          ...auditLog,
          metadata: auditLog.metadata ? JSON.parse(auditLog.metadata) : undefined
        } as AuditLog
      };

    } catch (error) {
      console.error('Error creating audit log:', error);
      return {
        success: false,
        error: 'AUDIT_LOG_CREATION_FAILED'
      };
    }
  }

  /**
   * Log role change actions
   */
  async logRoleChange(input: RoleChangeAuditInput): Promise<AuditLogResult> {
    return this.createAuditLog({
      action: 'ROLE_ASSIGNED',
      performedBy: input.performedBy,
      targetUserId: input.targetUserId,
      fromRole: input.fromRole,
      toRole: input.toRole,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata
    });
  }

  /**
   * Log user management actions
   */
  async logUserManagement(input: UserManagementAuditInput): Promise<AuditLogResult> {
    return this.createAuditLog({
      action: input.action,
      performedBy: input.performedBy,
      targetUserId: input.targetUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata
    });
  }

  /**
   * Log permission change actions
   */
  async logPermissionChange(input: PermissionChangeAuditInput): Promise<AuditLogResult> {
    return this.createAuditLog({
      action: input.action,
      performedBy: input.performedBy,
      targetUserId: input.targetUserId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata
    });
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(page: number = 1, pageSize: number = 20): Promise<AuditLogListResult> {
    try {
      const { data: auditLogs } = await client.models.AuditLog.list();
      
      // Sort by timestamp (most recent first)
      const sortedLogs = auditLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalCount = sortedLogs.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

      // Parse metadata for each log
      const processedLogs: AuditLog[] = paginatedLogs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      })) as AuditLog[];

      return {
        success: true,
        logs: processedLogs,
        totalCount,
        page,
        pageSize
      };

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return {
        success: false,
        logs: [],
        totalCount: 0,
        page,
        pageSize,
        error: 'FETCH_AUDIT_LOGS_FAILED'
      };
    }
  }

  /**
   * Get audit logs by user
   */
  async getAuditLogsByUser(userId: string, page: number = 1, pageSize: number = 20): Promise<AuditLogListResult> {
    try {
      const { data: auditLogs } = await client.models.AuditLog.list({
        filter: { targetUserId: { eq: userId } }
      });

      const sortedLogs = auditLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalCount = sortedLogs.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

      const processedLogs: AuditLog[] = paginatedLogs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      })) as AuditLog[];

      return {
        success: true,
        logs: processedLogs,
        totalCount,
        page,
        pageSize
      };

    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      return {
        success: false,
        logs: [],
        totalCount: 0,
        page,
        pageSize,
        error: 'FETCH_USER_AUDIT_LOGS_FAILED'
      };
    }
  }

  /**
   * Get audit logs by performer
   */
  async getAuditLogsByPerformer(performerId: string, page: number = 1, pageSize: number = 20): Promise<AuditLogListResult> {
    try {
      const { data: auditLogs } = await client.models.AuditLog.list({
        filter: { performedBy: { eq: performerId } }
      });

      const sortedLogs = auditLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalCount = sortedLogs.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

      const processedLogs: AuditLog[] = paginatedLogs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      })) as AuditLog[];

      return {
        success: true,
        logs: processedLogs,
        totalCount,
        page,
        pageSize
      };

    } catch (error) {
      console.error('Error fetching performer audit logs:', error);
      return {
        success: false,
        logs: [],
        totalCount: 0,
        page,
        pageSize,
        error: 'FETCH_PERFORMER_AUDIT_LOGS_FAILED'
      };
    }
  }

  /**
   * Filter audit logs with complex criteria
   */
  async filterAuditLogs(
    filter: AuditLogFilter, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<AuditLogListResult> {
    try {
      // Build Amplify filter
      const amplifyFilter: any = {};

      if (filter.actions && filter.actions.length > 0) {
        amplifyFilter.action = { in: filter.actions };
      }

      if (filter.performedBy) {
        amplifyFilter.performedBy = { eq: filter.performedBy };
      }

      if (filter.targetUserId) {
        amplifyFilter.targetUserId = { eq: filter.targetUserId };
      }

      if (filter.success !== undefined) {
        amplifyFilter.success = { eq: filter.success };
      }

      if (filter.ipAddress) {
        amplifyFilter.ipAddress = { eq: filter.ipAddress };
      }

      const { data: auditLogs } = await client.models.AuditLog.list({
        filter: Object.keys(amplifyFilter).length > 0 ? amplifyFilter : undefined
      });

      // Apply date range filter (client-side since Amplify doesn't support complex date queries easily)
      let filteredLogs = auditLogs;
      
      if (filter.startDate || filter.endDate) {
        filteredLogs = auditLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          
          if (filter.startDate && logDate < new Date(filter.startDate)) {
            return false;
          }
          
          if (filter.endDate && logDate > new Date(filter.endDate)) {
            return false;
          }
          
          return true;
        });
      }

      const sortedLogs = filteredLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalCount = sortedLogs.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

      const processedLogs: AuditLog[] = paginatedLogs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : undefined
      })) as AuditLog[];

      return {
        success: true,
        logs: processedLogs,
        totalCount,
        page,
        pageSize
      };

    } catch (error) {
      console.error('Error filtering audit logs:', error);
      return {
        success: false,
        logs: [],
        totalCount: 0,
        page,
        pageSize,
        error: 'FILTER_AUDIT_LOGS_FAILED'
      };
    }
  }

  /**
   * Delete old audit logs
   */
  async deleteOldAuditLogs(cutoffDate: string): Promise<AuditLogDeleteResult> {
    try {
      const { data: auditLogs } = await client.models.AuditLog.list();
      
      const logsToDelete = auditLogs.filter(log => 
        new Date(log.timestamp) < new Date(cutoffDate)
      );

      let deletedCount = 0;
      
      for (const log of logsToDelete) {
        try {
          await client.models.AuditLog.delete({ id: log.id });
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete audit log ${log.id}:`, error);
        }
      }

      return {
        success: true,
        deletedCount
      };

    } catch (error) {
      console.error('Error deleting old audit logs:', error);
      return {
        success: false,
        deletedCount: 0,
        error: 'DELETE_OLD_LOGS_FAILED'
      };
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    filter: AuditLogFilter, 
    format: 'csv' | 'json'
  ): Promise<AuditLogExportResult> {
    try {
      const result = await this.filterAuditLogs(filter, 1, 10000); // Get all matching logs

      if (!result.success) {
        return {
          success: false,
          data: '',
          format,
          filename: '',
          recordCount: 0,
          error: result.error
        };
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `audit_logs_${timestamp}.${format}`;

      let exportData: string;

      if (format === 'csv') {
        const headers = [
          'ID', 'Action', 'Performed By', 'Target User', 'From Role', 'To Role',
          'Timestamp', 'IP Address', 'User Agent', 'Success', 'Error Message', 'Metadata'
        ];

        const csvRows = [
          headers.join(','),
          ...result.logs.map(log => [
            log.id,
            log.action,
            log.performedBy,
            log.targetUserId || '',
            log.fromRole || '',
            log.toRole || '',
            log.timestamp,
            log.ipAddress || '',
            log.userAgent || '',
            log.success?.toString() || 'true',
            log.errorMessage || '',
            log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ''
          ].map(field => `"${field}"`).join(','))
        ];

        exportData = csvRows.join('\n');
      } else {
        exportData = JSON.stringify(result.logs, null, 2);
      }

      return {
        success: true,
        data: exportData,
        format,
        filename,
        recordCount: result.logs.length
      };

    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return {
        success: false,
        data: '',
        format,
        filename: '',
        recordCount: 0,
        error: 'EXPORT_LOGS_FAILED'
      };
    }
  }

  /**
   * Generate audit report with statistics
   */
  async generateAuditReport(filter: AuditLogFilter): Promise<AuditReportResult> {
    try {
      const result = await this.filterAuditLogs(filter, 1, 10000);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const logs = result.logs;

      // Generate summary
      const summary = {
        totalActions: logs.length,
        uniquePerformers: new Set(logs.map(log => log.performedBy)).size,
        uniqueTargets: new Set(logs.filter(log => log.targetUserId).map(log => log.targetUserId)).size,
        mostCommonAction: this.getMostCommonAction(logs),
        timeRange: {
          start: filter.startDate || (logs.length > 0 ? logs[logs.length - 1].timestamp : ''),
          end: filter.endDate || (logs.length > 0 ? logs[0].timestamp : '')
        }
      };

      // Generate action breakdown
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<AuditAction, number>);

      const actionBreakdown = Object.entries(actionCounts).map(([action, count]) => ({
        action: action as AuditAction,
        count,
        percentage: (count / logs.length) * 100
      }));

      // Generate top performers
      const performerCounts = logs.reduce((acc, log) => {
        if (!acc[log.performedBy]) {
          acc[log.performedBy] = { count: 0, actions: {} };
        }
        acc[log.performedBy].count++;
        acc[log.performedBy].actions[log.action] = (acc[log.performedBy].actions[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, { count: number; actions: Record<AuditAction, number> }>);

      const topPerformers = Object.entries(performerCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([performerId, data]) => ({
          performerId,
          actionCount: data.count,
          mostCommonAction: Object.entries(data.actions).sort(([, a], [, b]) => b - a)[0]?.[0] as AuditAction
        }));

      // Generate timeline data (daily breakdown)
      const timelineData = this.generateTimelineData(logs);

      const report = {
        summary,
        actionBreakdown,
        topPerformers,
        timelineData,
        generatedAt: new Date().toISOString()
      };

      return {
        success: true,
        report
      };

    } catch (error) {
      console.error('Error generating audit report:', error);
      return {
        success: false,
        error: 'REPORT_GENERATION_FAILED'
      };
    }
  }

  /**
   * Helper method to get most common action
   */
  private getMostCommonAction(logs: AuditLog[]): AuditAction {
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<AuditAction, number>);

    return Object.entries(actionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] as AuditAction || 'USER_CREATED';
  }

  /**
   * Helper method to generate timeline data
   */
  private generateTimelineData(logs: AuditLog[]) {
    const dailyData = logs.reduce((acc, log) => {
      const date = log.timestamp.split('T')[0];
      if (!acc[date]) {
        acc[date] = { totalActions: 0, actionCounts: {} as Record<AuditAction, number> };
      }
      acc[date].totalActions++;
      acc[date].actionCounts[log.action] = (acc[date].actionCounts[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, { totalActions: number; actionCounts: Record<AuditAction, number> }>);

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        actionCounts: data.actionCounts,
        totalActions: data.totalActions
      }));
  }
}