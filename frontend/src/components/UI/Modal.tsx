import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizes[size]} rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-modal-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar p-6">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t border-gray-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};
