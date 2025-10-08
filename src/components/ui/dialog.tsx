import { type LucideProps, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface Props {
  children: ReactNode;
  onClose: () => void;
  title: string;
  icon?: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  classNames?: Partial<{
    backdrop: string;
    modal: string;
    content: string;
  }>;
}

const Dialog = ({ children, onClose, title, icon: Icon, classNames }: Props) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]",
          classNames?.backdrop,
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-[9999] transform",
          "overflow-hidden",
          // Card styling
          "rounded-xl border border-border bg-primary-bg shadow-2xl",
          // Subtle inner outline for depth
          "ring-1 ring-black/5",
          "flex flex-col",
          classNames?.modal,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-text-lighter" />}
            <h2 className="font-semibold text-sm text-text tracking-wide">{title}</h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-lighter transition-colors hover:bg-hover hover:text-text"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className={cn("flex flex-1 overflow-hidden", classNames?.content)}>{children}</div>
      </div>
    </>
  );
};

export default Dialog;
