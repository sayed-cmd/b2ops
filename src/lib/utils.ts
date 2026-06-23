import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter } from 'date-fns'
import type { RequestPriority, RequestStatus } from '@/types'

// ─── Class Name Helper ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Formatters ──────────────────────────────────────────────────────────
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM dd, yyyy')
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'MMM dd, yyyy · hh:mm a')
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatTime(val: string | null | undefined): string {
  if (!val) return '—'
  // Handle ISO datetime — extract time only if before 1970
  if (val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const d = new Date(val)
    if (d.getFullYear() <= 1900) {
      return format(d, 'hh:mm a')
    }
    return format(d, 'MMM dd, yyyy')
  }
  return val
}

export function isSLABreached(dueDate: string | null): boolean {
  if (!dueDate) return false
  return isAfter(new Date(), new Date(dueDate))
}

// ─── Status Config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    dot: 'bg-slate-400',
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-400',
  },
  review_requested: {
    label: 'Review Requested',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
  },
  clarification_needed: {
    label: 'Clarification Needed',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    dot: 'bg-purple-500',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
  },
}

// ─── Priority Config ──────────────────────────────────────────────────────────
export const PRIORITY_CONFIG: Record<
  RequestPriority,
  { label: string; color: string; bg: string }
> = {
  low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-50' },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-50' },
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-50' },
}

// ─── Request ID Generator ─────────────────────────────────────────────────────
export function generateReqId(): string {
  return `REQ-${Date.now()}`
}

// ─── String Helpers ───────────────────────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

// ─── Local Storage ────────────────────────────────────────────────────────────
export function getStoredFilters<T>(key: string, defaults: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults
  } catch {
    return defaults
  }
}

export function setStoredFilters<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}
