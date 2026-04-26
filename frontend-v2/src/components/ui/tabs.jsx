import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsCtx = createContext(null);

export function Tabs({ defaultValue, value: controlledValue, onValueChange, className, children }) {
  const [internal, setInternal] = useState(defaultValue || '');
  const value = controlledValue !== undefined ? controlledValue : internal;
  const onChange = onValueChange || setInternal;
  return (
    <TabsCtx.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className, children }) {
  return (
    <div className={cn('inline-flex items-center rounded-lg bg-muted p-1 gap-1', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.onChange(value)}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}
