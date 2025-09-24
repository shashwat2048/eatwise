"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type RainbowButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "solid";
};

export const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className, children, variant = "outline", ...props }, ref) => {
    if (variant === "solid") {
      return (
        <button
          ref={ref}
          className={cn(
            "relative inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
            "text-white",
            "bg-[linear-gradient(90deg,#f97316,#f59e0b,#84cc16,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899)]",
            "hover:opacity-90 transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
            className
          )}
          {...props}
        >
          {children}
        </button>
      );
    }

    // outline variant (default)
    return (
      <span className={cn(
        "inline-flex rounded-md p-[1.5px]",
        "bg-[linear-gradient(90deg,#f97316,#f59e0b,#84cc16,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899)]"
      )}>
        <button
          ref={ref}
          className={cn(
            "inline-flex items-center justify-center rounded-[6px]",
            "bg-background text-foreground hover:bg-accent",
            "px-3 py-1.5 text-sm font-medium transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
            "disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </button>
      </span>
    );
  }
);

RainbowButton.displayName = "RainbowButton";


