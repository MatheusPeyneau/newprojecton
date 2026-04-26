import { cn } from '@/lib/utils';

export function Separator({ className, orientation = 'horizontal' }) {
  return (
    <div
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
    />
  );
}
