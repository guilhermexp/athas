import { CircleAlert, CircleCheck, CircleQuestionMark, CircleX, X } from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { cn } from "@/utils/cn";

export const ToastContainer = () => {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 text-text">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative flex min-w-[300px] max-w-[400px] flex-col gap-3",
            toast.isExiting ? "animate-slide-out-right" : "animate-slide-in-right",
            "rounded border border-border bg-primary-bg px-4 py-3 shadow",
          )}
        >
          <div className="flex items-start gap-3">
            {toast.type === "error" && <CircleX size={14} className="mt-1 text-error" />}
            {toast.type === "warning" && <CircleAlert size={14} className="mt-1 text-warning" />}
            {toast.type === "success" && <CircleCheck size={14} className="mt-1 text-success" />}
            {toast.type === "info" && <CircleQuestionMark size={14} className="mt-1 text-info" />}

            <p className="flex-1 text-sm">{toast.message}</p>

            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 transition-colors hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>

          {toast.action && (
            <div className="flex justify-end">
              <button
                onClick={toast.action.onClick}
                className="rounded bg-white/20 px-3 py-1 font-medium text-xs transition-colors hover:bg-white/30"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
