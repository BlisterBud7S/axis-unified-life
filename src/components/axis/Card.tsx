import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  glow,
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return <div className={cn("glass p-5", glow && "glow-accent", className)} {...props} />;
}

export function CardTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}
