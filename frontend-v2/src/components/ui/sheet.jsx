import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Sheet({ open, onOpenChange, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onOpenChange?.(false); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
}

export function SheetContent({ side = 'right', className, children, ...props }) {
  const sideClasses = {
    right: 'right-0 top-0 h-full w-full sm:max-w-md',
    left: 'left-0 top-0 h-full w-full sm:max-w-md',
    bottom: 'bottom-0 left-0 w-full max-h-[90vh]',
  };
  return (
    <div
      className={cn(
        'fixed z-50 bg-card border-l border-border shadow-xl flex flex-col overflow-y-auto',
        sideClasses[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SheetHeader({ className, children }) {
  return <div className={cn('px-6 py-4 border-b border-border', className)}>{children}</div>;
}

export function SheetTitle({ className, children }) {
  return <h2 className={cn('text-lg font-semibold text-foreground', className)}>{children}</h2>;
}

export function SheetDescription({ className, children }) {
  return <p className={cn('text-sm text-muted-foreground mt-1', className)}>{children}</p>;
}

export function SheetFooter({ className, children }) {
  return <div className={cn('px-6 py-4 border-t border-border flex justify-end gap-2', className)}>{children}</div>;
}

export function SheetClose({ children, onClick }) {
  return <button type="button" onClick={onClick}>{children}</button>;
}
