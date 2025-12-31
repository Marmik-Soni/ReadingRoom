import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Variants
            "bg-black text-white shadow-sm hover:bg-gray-800 focus-visible:outline-black":
              variant === "primary",
            "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:outline-gray-900":
              variant === "secondary",
            "border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:outline-gray-900":
              variant === "outline",
            // Sizes
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-6 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
