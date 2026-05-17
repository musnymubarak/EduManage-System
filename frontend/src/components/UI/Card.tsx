import React from 'react';
import { cn } from '../../utils/helpers';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  actions,
  padding = 'md',
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/70 bg-white shadow-sm',
        paddings[padding],
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
