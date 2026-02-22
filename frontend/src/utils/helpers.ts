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
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    PAID: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-orange-100 text-orange-800',
    OVERDUE: 'bg-red-100 text-red-800',
    PRESENT: 'bg-green-100 text-green-800',
    ABSENT: 'bg-red-100 text-red-800',
    LATE: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
