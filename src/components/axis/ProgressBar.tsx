import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  label,
  suffix,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number | null;
  label?: string;
  suffix?: string;
  tone?: "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const safeMax = max && max > 0 ? max : 0;
  const pct = safeMax ? Math.min(100, Math.round((value / safeMax) * 100)) : 0;
  const tones = {
    accent: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  } as const;

  return (
    <div className={cn("w-full", className)}>
      {(label || safeMax) && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground tabular-nums">
            {Math.round(value)}
            {safeMax ? ` / ${Math.round(safeMax)}` : ""}
            {suffix ?? ""}
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", tones[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
