import { useState } from 'react';
import { cn } from '@/lib/utils';

export function TooltipProvider({ children }) {
  return <>{children}</>;
}

export function Tooltip({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

export function TooltipTrigger({ children, asChild }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className, side = 'top' }) {
  return null; // Simplified - just a stub so imports don't break
}
