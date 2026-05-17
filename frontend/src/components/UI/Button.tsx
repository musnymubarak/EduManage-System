import React from 'react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary:
      'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500/30',
    secondary:
      'bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400/30',
    danger:
      'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500/30',
    success:
      'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500/30',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400/30',
    outline:
      'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400/30',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-sm gap-2',
    icon: 'h-9 w-9 p-0',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
