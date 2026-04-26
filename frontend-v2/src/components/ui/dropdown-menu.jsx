import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const CtxOpen = createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <CtxOpen.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </CtxOpen.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }) {
  const ctx = useContext(CtxOpen);
  return <div onClick={() => ctx?.setOpen(v => !v)}>{children}</div>;
}

export function DropdownMenuContent({ children, className, align = 'end' }) {
  const ctx = useContext(CtxOpen);
  if (!ctx?.open) return null;
  return (
    <div className={cn(
      'absolute z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-card shadow-lg py-1',
      align === 'end' ? 'right-0' : 'left-0',
      className
    )}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, className, onClick, ...props }) {
  const ctx = useContext(CtxOpen);
  return (
    <button
      type="button"
      className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors text-left', className)}
      onClick={(e) => { onClick?.(e); ctx?.setOpen(false); }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }) {
  return <div className={cn('h-px bg-border my-1', className)} />;
}

export function DropdownMenuLabel({ children, className }) {
  return <div className={cn('px-3 py-1 text-xs font-semibold text-muted-foreground', className)}>{children}</div>;
}

export function DropdownMenuSub({ children }) { return <>{children}</>; }
export function DropdownMenuSubTrigger({ children }) { return <DropdownMenuItem>{children}</DropdownMenuItem>; }
export function DropdownMenuSubContent({ children }) { return null; }
export function DropdownMenuGroup({ children }) { return <>{children}</>; }
export function DropdownMenuShortcut({ children }) { return <span className="ml-auto text-xs text-muted-foreground">{children}</span>; }
export function DropdownMenuCheckboxItem({ children, checked, onCheckedChange, ...props }) {
  return <DropdownMenuItem onClick={() => onCheckedChange?.(!checked)} {...props}>{children}</DropdownMenuItem>;
}
