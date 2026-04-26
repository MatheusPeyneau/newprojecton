import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary/10 text-primary',
  secondary: 'bg-muted text-muted-foreground',
  destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  outline: 'border border-border text-foreground',
};

export function Badge({ className, variant = 'default', children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
