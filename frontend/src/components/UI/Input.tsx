import React from 'react';
import { cn } from '../../utils/helpers';

const baseField =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 h-10 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

const labelClass = 'block text-sm font-medium text-gray-700';
const helperClass = 'text-xs text-red-600';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={labelClass}>
          {label}
          {props.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <input
        className={cn(baseField, error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20', className)}
        {...props}
      />
      {error && <p className={helperClass}>{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={labelClass}>
          {label}
          {props.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <select
        className={cn(baseField, 'pr-8', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20', className)}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className={helperClass}>{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={labelClass}>
          {label}
          {props.required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 ' +
            'transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        rows={4}
        {...props}
      />
      {error && <p className={helperClass}>{error}</p>}
    </div>
  );
};
