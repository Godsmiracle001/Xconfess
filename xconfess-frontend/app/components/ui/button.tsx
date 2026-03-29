import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  /** When true, renders a spinner and disables the button. */
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        type={type}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-zinc-100 text-zinc-900 hover:bg-zinc-200": variant === "default",
            "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800":
              variant === "outline",
            "text-zinc-100 hover:bg-zinc-800": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-base": size === "md",
            "h-12 px-6 text-lg": size === "lg",
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
