import { AiChat } from "@/components/axis/AiChat";
import { cn } from "@/lib/utils";
import { Bot, X } from "lucide-react";
import { useState } from "react";

export function FloatingAI() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <button
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <div className="glass relative flex h-[70vh] w-full max-w-md flex-col rounded-2xl border border-border p-4 shadow-2xl sm:h-[68vh]">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ask AXIS</p>
                <p className="text-xs text-muted-foreground">Anywhere in the app</p>
              </div>
              <button
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AiChat source="floating" compact />
          </div>
        </div>
      ) : null}

      <button
        aria-label="Open AXIS assistant"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105",
          open && "hidden",
        )}
      >
        <Bot className="h-6 w-6" />
      </button>
    </>
  );
}
