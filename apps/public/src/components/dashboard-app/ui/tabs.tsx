"use client";

import * as React from "react";
import { cn } from "@/lib/dashboard/utils";

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(
    defaultValue || ""
  );

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = React.useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [controlledValue, onValueChange]);

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childType = (child.type as any)?.displayName || (child.type as any)?.name;
          const isTabComponent = childType === 'TabsList' || childType === 'TabsContent' || childType === 'TabsTrigger';
          
          if (isTabComponent) {
            return React.cloneElement(child, { 
              value, 
              onValueChange: handleValueChange 
            } as any);
          }
        }
        return child;
      })}
    </div>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, value, onValueChange, ...props }, ref) => {
    // Don't pass value and onValueChange to the div element
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-auto items-center justify-start gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200 px-1",
          "scrollbar-hide",
          className
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { currentValue: value, onValueChange } as any);
          }
          return child;
        })}
      </div>
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, value, currentValue, onValueChange, ...props }, ref) => {
  const isActive = value === currentValue;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-4 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative",
        isActive
          ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
        className
      )}
      onClick={() => onValueChange?.(value)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  currentValue?: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, currentValue, children, ...props }, ref) => {
    // Use the passed currentValue from parent, or fall back to value for backwards compatibility
    const activeValue = currentValue !== undefined ? currentValue : value;
    
    if (value !== activeValue) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";
