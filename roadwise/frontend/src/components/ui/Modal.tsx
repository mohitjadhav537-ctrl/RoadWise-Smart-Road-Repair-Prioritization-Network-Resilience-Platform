import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full rounded-xl bg-white shadow-2xl focus:outline-none',
            'max-h-[90vh] overflow-y-auto',
            sizeMap[size],
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                {title && (
                  <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="ml-4 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          )}
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
