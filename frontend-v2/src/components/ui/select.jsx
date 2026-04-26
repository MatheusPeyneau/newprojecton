import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('[data-select-content]') && !e.target.closest('[data-select-trigger]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openDropdown = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(v => !v);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, label, setLabel, rect, triggerRef, openDropdown }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      ref={ctx?.triggerRef}
      data-select-trigger
      onClick={ctx?.openDropdown}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={14} className={cn('text-muted-foreground shrink-0 ml-2 transition-transform', ctx?.open && 'rotate-180')} />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const ctx = useContext(SelectContext);
  const display = ctx?.label || ctx?.value;
  return (
    <span className={!display ? 'text-muted-foreground' : ''}>
      {display || placeholder || 'Selecione'}
    </span>
  );
}

export function SelectContent({ className, children }) {
  const ctx = useContext(SelectContext);
  if (!ctx?.open || !ctx?.rect) return null;

  const r = ctx.rect;
  const spaceBelow = window.innerHeight - r.bottom;
  const openUp = spaceBelow < 200 && r.top > 200;

  const style = {
    position: 'fixed',
    left: r.left,
    width: Math.max(r.width, 160),
    zIndex: 9999,
    ...(openUp
      ? { bottom: window.innerHeight - r.top, top: 'auto' }
      : { top: r.bottom + 4 }),
  };

  return (
    <div
      data-select-content
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card shadow-xl py-1 max-h-60 overflow-y-auto',
        className
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className }) {
  const ctx = useContext(SelectContext);
  const isSelected = ctx?.value === value;
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        ctx?.onValueChange?.(value);
        ctx?.setLabel(typeof children === 'string' ? children : '');
        ctx?.setOpen(false);
      }}
      className={cn(
        'flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left whitespace-nowrap',
        isSelected && 'text-brand-500 font-medium bg-brand-500/5',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SelectGroup({ children }) { return <>{children}</>; }
export function SelectLabel({ children, className }) {
  return <div className={cn('px-3 py-1 text-xs font-semibold text-muted-foreground', className)}>{children}</div>;
}
export function SelectSeparator({ className }) {
  return <div className={cn('h-px bg-border my-1', className)} />;
}
