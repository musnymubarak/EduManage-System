import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    PRINCIPAL: 'Principal',
    VICE_PRINCIPAL: 'Vice Principal',
    RECEPTIONIST: 'Receptionist',
    EXPENDITURE_RECEPTIONIST: 'Expenditure Receptionist',
  };
  return roleNames[role] || role;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    INACTIVE: 'bg-gray-100 text-gray-700 ring-gray-500/20',
    PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    PARTIAL: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    OVERDUE: 'bg-red-50 text-red-700 ring-red-600/20',
    PRESENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    ABSENT: 'bg-red-50 text-red-700 ring-red-600/20',
    LATE: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    RESIGNED: 'bg-red-50 text-red-700 ring-red-600/20',
    TERMINATED: 'bg-red-50 text-red-700 ring-red-600/20',
    RETIRED: 'bg-gray-100 text-gray-700 ring-gray-500/20',
    CONTRACT_EXPIRED: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 ring-gray-500/20';
}

export function getFileUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = apiBase.replace('/api', '');
  
  return `${serverBase}${path.startsWith('/') ? '' : '/'}${path}`;
}
