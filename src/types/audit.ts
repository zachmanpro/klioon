import type { UserRole } from './user';

// Audit action types
export type AuditAction = 
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'USER_SOFT_DELETED'
  | 'USER_HARD_DELETED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'EMAIL_VERIFIED'
  | 'PROFILE_UPDATED'
  | 'BULK_OPERATION'
  | 'ADMIN_ACCESS'
  | 'SECURITY_VIOLATION';

// Audit log entry
export interface AuditLog {
  id: string;
  action: AuditAction;
  performedBy: string;
  targetUserId?: string;
  fromRole?: UserRole;
  toRole?: UserRole;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

// Audit log creation input
export interface CreateAuditLogInput {
  action: AuditAction;
  performedBy: string;
  targetUserId?: string;
  fromRole?: UserRole;
  toRole?: UserRole;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

// Audit log filter for querying
export interface AuditLogFilter {
  actions?: AuditAction[];
  performedBy?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  ipAddress?: string;
}

// Audit log response with pagination
export interface AuditLogResponse {
  logs: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Audit log service responses
export interface AuditLogResult {
  success: boolean;
  auditLog?: AuditLog;
  error?: string;
}

export interface AuditLogListResult {
  success: boolean;
  logs: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  error?: string;
}

export interface AuditLogDeleteResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

export interface AuditLogExportResult {
  success: boolean;
  data?: string;
  format: 'csv' | 'json';
  filename: string;
  recordCount: number;
  error?: string;
}

// Audit report types
export interface AuditReportSummary {
  totalActions: number;
  uniquePerformers: number;
  uniqueTargets: number;
  mostCommonAction: AuditAction;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface AuditActionBreakdown {
  action: AuditAction;
  count: number;
  percentage: number;
}

export interface AuditPerformerStats {
  performerId: string;
  performerName?: string;
  actionCount: number;
  mostCommonAction: AuditAction;
}

export interface AuditTimelineData {
  date: string;
  actionCounts: Record<AuditAction, number>;
  totalActions: number;
}

export interface AuditReport {
  summary: AuditReportSummary;
  actionBreakdown: AuditActionBreakdown[];
  topPerformers: AuditPerformerStats[];
  timelineData: AuditTimelineData[];
  generatedAt: string;
}

export interface AuditReportResult {
  success: boolean;
  report?: AuditReport;
  error?: string;
}

// Role change audit log specific types
export interface RoleChangeAuditInput {
  performedBy: string;
  targetUserId: string;
  fromRole: UserRole;
  toRole: UserRole;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    reason?: string;
    requestedBy?: string;
    requestTicket?: string;
    temporary?: boolean;
    expiresAt?: string;
  };
}

// User management audit log specific types
export interface UserManagementAuditInput {
  action: AuditAction;
  performedBy: string;
  targetUserId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    reason?: string;
    deletionType?: 'soft' | 'hard';
    previousRole?: UserRole;
    requestTicket?: string;
  };
}

// Permission change audit log specific types
export interface PermissionChangeAuditInput {
  action: AuditAction;
  performedBy: string;
  targetUserId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    permission?: string;
    permissions?: string[];
    reason?: string;
    temporary?: boolean;
    expiresAt?: string;
    requestTicket?: string;
  };
}