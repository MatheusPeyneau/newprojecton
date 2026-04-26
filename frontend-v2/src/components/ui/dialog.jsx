import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onOpenChange?.(false); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative z-50 w-full bg-card border border-border rounded-xl shadow-xl p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function DialogTitle({ className, children }) {
  return <h2 className={cn('text-lg font-semibold text-foreground', className)}>{children}</h2>;
}

export function DialogFooter({ className, children }) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)}>{children}</div>;
}

export function DialogDescription({ className, children }) {
  return <p className={cn('text-sm text-muted-foreground mt-1', className)}>{children}</p>;
}
