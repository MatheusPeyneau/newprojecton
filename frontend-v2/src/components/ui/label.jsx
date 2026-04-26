import { cn } from '@/lib/utils';

export function Label({ className, children, ...props }) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)} {...props}>
      {children}
    </label>
  );
}
