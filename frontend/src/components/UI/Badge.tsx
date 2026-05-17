import React from 'react';
import { cn, getStatusColor } from '../../utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
  status?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, className, status, title }) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    default: 'bg-gray-100 text-gray-700 ring-gray-600/20',
  };

  const badgeClass = status ? getStatusColor(status) : variant ? variants[variant] : variants.default;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeClass,
        className
      )}
    >
      {children}
    </span>
  );
};
