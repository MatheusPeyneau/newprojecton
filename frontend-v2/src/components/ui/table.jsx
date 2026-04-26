import { cn } from '@/lib/utils';

export function Table({ className, children }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  );
}
export function TableHeader({ children }) {
  return <thead className="border-b border-border bg-muted/30">{children}</thead>;
}
export function TableBody({ children }) {
  return <tbody>{children}</tbody>;
}
export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn('border-b border-border last:border-0 hover:bg-muted/20 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}
export function TableHead({ className, children }) {
  return (
    <th className={cn('px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}>
      {children}
    </th>
  );
}
export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 text-foreground', className)} {...props}>
      {children}
    </td>
  );
}
