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
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
  };

  const badgeClass = status ? getStatusColor(status) : variant ? variants[variant] : variants.default;

  return (
    <span
      title={title}
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        badgeClass,
        className
      )}
    >
      {children}
    </span>
  );
};
