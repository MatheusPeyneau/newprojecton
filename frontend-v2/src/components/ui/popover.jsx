import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Popover({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

export function PopoverTrigger({ children, asChild, onClick }) {
  return <div onClick={onClick}>{children}</div>;
}

export function PopoverContent({ children, className, align = 'center' }) {
  return (
    <div className={cn(
      'absolute z-50 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg p-3',
      align === 'end' ? 'right-0' : 'left-0',
      className
    )}>
      {children}
    </div>
  );
}
