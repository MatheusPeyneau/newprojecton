import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, defaultValue, children }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, label, setLabel }}>
      <div ref={ref} className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.setOpen(v => !v)}
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
  if (!ctx?.open) return null;
  return (
    <div
      className={cn(
        'absolute top-full left-0 z-[200] mt-1 w-full min-w-max rounded-lg border border-border bg-card shadow-lg py-1',
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
