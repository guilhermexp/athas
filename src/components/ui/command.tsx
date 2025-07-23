import { X } from "lucide-react";
import type React from "react";
import { forwardRef } from "react";
import { cn } from "@/utils/cn";

interface CommandProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}

const Command = forwardRef<HTMLDivElement, CommandProps>(
  ({ isVisible, children, className }, ref) => {
    if (!isVisible) return null;

    return (
      <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-16">
        <div
          ref={ref}
          className={cn(
            "pointer-events-auto flex max-h-[320px] w-[520px] flex-col overflow-hidden",
            "rounded-md border border-border bg-primary-bg shadow-2xl",
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);

Command.displayName = "Command";

interface CommandHeaderProps {
  children: React.ReactNode;
  onClose: () => void;
}

export const CommandHeader = ({ children, onClose }: CommandHeaderProps) => (
  <div className="border-border border-b">
    <div className="flex items-center gap-3 px-4 py-3">
      {children}
      <button onClick={onClose} className="rounded p-0.5 transition-colors hover:bg-hover">
        <X size={12} className="text-text-lighter" />
      </button>
    </div>
  </div>
);

interface CommandListProps {
  children: React.ReactNode;
}

export const CommandList = forwardRef<HTMLDivElement, CommandListProps>(({ children }, ref) => (
  <div ref={ref} className="custom-scrollbar-thin flex-1 overflow-y-auto p-1">
    {children}
  </div>
));

CommandList.displayName = "CommandList";

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  ({ value, onChange, placeholder, className }, ref) => (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "flex-1 bg-transparent text-text text-xs placeholder-text-lighter outline-none",
        className,
      )}
    />
  ),
);

CommandInput.displayName = "CommandInput";

interface CommandItemProps {
  children: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  [key: string]: any;
}

export const CommandItem = forwardRef<HTMLButtonElement, CommandItemProps>(
  (
    { children, isSelected = false, onClick, onMouseEnter, onMouseLeave, className, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
      className={cn(
        "mb-1 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left transition-colors",
        isSelected ? "bg-selected text-text" : "bg-transparent text-text hover:bg-hover",
        className,
      )}
    >
      {children}
    </button>
  ),
);

CommandItem.displayName = "CommandItem";

interface CommandEmptyProps {
  children: React.ReactNode;
}

export const CommandEmpty = ({ children }: CommandEmptyProps) => (
  <div className="p-3 text-center text-text-lighter text-xs">{children}</div>
);

export default Command;
