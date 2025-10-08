import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const InputGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full items-center gap-1 rounded-lg border border-border/60 bg-secondary-bg/80 backdrop-blur-sm transition-all focus-within:border-border hover:border-border",
          className,
        )}
        {...props}
      />
    );
  },
);
InputGroup.displayName = "InputGroup";

const InputGroupInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex-1 bg-transparent px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-lighter/60",
          className,
        )}
        {...props}
      />
    );
  },
);
InputGroupInput.displayName = "InputGroupInput";

const InputGroupTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea"> & { maxHeight?: string }
>(({ className, maxHeight = "200px", ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-lighter/60",
        className,
      )}
      style={{ maxHeight }}
      {...props}
    />
  );
});
InputGroupTextarea.displayName = "InputGroupTextarea";

interface InputGroupAddonProps extends ComponentPropsWithoutRef<"div"> {
  align?: "inline-start" | "inline-end";
}

const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "inline-start", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center", align === "inline-start" ? "pl-3" : "pr-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "rounded-md bg-accent/10 px-3 py-1.5 font-medium text-accent text-xs transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
InputGroupButton.displayName = "InputGroupButton";

const InputGroupText = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => {
    return <span ref={ref} className={cn("text-text-lighter/70 text-xs", className)} {...props} />;
  },
);
InputGroupText.displayName = "InputGroupText";

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};
