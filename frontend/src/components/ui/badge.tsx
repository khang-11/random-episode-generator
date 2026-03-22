import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
    destructive:
      "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
    outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
  };

  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
