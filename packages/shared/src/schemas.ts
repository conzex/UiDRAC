/**
 * schemas.ts — Zod validation schemas for API request/response validation.
 * Used by both the API (NestJS) and the frontend (Next.js) for runtime validation.
 */

import { z } from 'zod';
import {
  IDRAC_GENERATIONS,
  USER_ROLES,
  CREDENTIAL_MODES,
  POWER_ACTIONS,
  HEALTH_STATUSES,
  AUDIT_ACTIONS,
} from './constants';

// ── Auth schemas ──

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  totpCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  tenantName: z.string().min(2).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

// ── Server schemas ──

export const ipAddressSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    'Invalid IP address',
  )
  .or(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$/, 'Invalid hostname'));

export const addServerSchema = z.object({
  name: z.string().min(1).max(255),
  ip: ipAddressSchema,
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  credentialsMode: z.enum(CREDENTIAL_MODES),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const serverProbeSchema = z.object({
  ip: ipAddressSchema,
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

// ── Power action schema ──

export const powerActionSchema = z.object({
  action: z.enum(POWER_ACTIONS),
});

// ── Console schemas ──

export const spawnConsoleSchema = z.object({
  serverId: z.string().uuid(),
  idracIp: ipAddressSchema,
  username: z.string().min(1),
  password: z.string().min(1),
  generation: z.enum(IDRAC_GENERATIONS),
});

// ── Pagination schema ──

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ── Audit log filter schema ──

export const auditLogFilterSchema = paginationSchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  userId: z.string().uuid().optional(),
  serverId: z.string().uuid().optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
});

// ── User management schemas ──

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

// ── Virtual media schema ──

export const virtualMediaSchema = z.object({
  isoUrl: z.string().url('Must be a valid URL to an ISO file'),
});

// ── Server filter schema ──

export const serverFilterSchema = paginationSchema.extend({
  generation: z.enum(IDRAC_GENERATIONS).optional(),
  health: z.enum(HEALTH_STATUSES).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

// ── Tenant settings schema ──

export const tenantSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  ipAllowlist: z.array(z.string()).optional(),
});

// ── CSV import schema ──

export const csvImportRowSchema = z.object({
  ip: ipAddressSchema,
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1).optional(),
});
