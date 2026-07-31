import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "danger" | "accent";
  className?: string;
  children?: ReactNode;
}) {
  const tones = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    accent: "text-primary",
  } as const;

  return (
    <div className={cn("glass p-4", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span className="tracking-wide uppercase">{label}</span>
      </div>
      <div className={cn("mt-2 text-xl font-semibold break-words", tones[tone])}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {children}
    </div>
  );
}
