import { cn } from '@/lib/utils';

export function Avatar({ className, children }) {
  return (
    <div className={cn('relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full', className)}>
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt, className }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={cn('h-full w-full object-cover', className)} />;
}

export function AvatarFallback({ className, children }) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-muted text-xs font-medium text-muted-foreground', className)}>
      {children}
    </div>
  );
}
