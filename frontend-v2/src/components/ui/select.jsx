import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function Select({ value, onValueChange, children, ...props }) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative" {...props}>{children}</div>
    </SelectContext.Provider>
  );
}

import { createContext, useContext, useState, useRef, useEffect } from 'react';
const SelectContext = createContext(null);

export function SelectTrigger({ className, children, ...props }) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const ctx = useContext(SelectContext);
  return <span className={ctx?.value ? '' : 'text-muted-foreground'}>{ctx?.value || placeholder || 'Selecione'}</span>;
}

export function SelectContent({ className, children }) {
  return (
    <div className={cn(
      'absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1',
      className
    )}>
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
      onClick={() => ctx?.onValueChange?.(value)}
      className={cn(
        'flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left',
        isSelected && 'text-brand-500 font-medium',
        className
      )}
    >
      {children}
    </button>
  );
}
