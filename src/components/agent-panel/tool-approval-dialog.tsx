import { Check, ChevronDown, X } from "lucide-react";
import { memo, useState } from "react";
import type { ToolApproval } from "@/components/agent-panel/types";
import Dialog from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

interface ToolApprovalDialogProps {
  approvals: ToolApproval[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onClose: () => void;
}

/**
 * Tool Approval Dialog
 * Shows pending tool approvals in queue order
 * Allows user to approve or reject each tool call
 */
export const ToolApprovalDialog = memo(
  ({ approvals, onApprove, onReject, onClose }: ToolApprovalDialogProps) => {
    const [expandedId, setExpandedId] = useState<string | null>(
      approvals.length > 0 ? approvals[0].id : null,
    );

    if (approvals.length === 0) {
      return null;
    }

    const handleApprove = (approvalId: string) => {
      onApprove(approvalId);
      // If this was the only approval, close dialog
      if (approvals.length === 1) {
        onClose();
      }
    };

    const handleReject = (approvalId: string) => {
      onReject(approvalId);
      // If this was the only approval, close dialog
      if (approvals.length === 1) {
        onClose();
      }
    };

    const handleApproveAll = () => {
      approvals.forEach((approval) => {
        if (approval.status === "pending") {
          onApprove(approval.id);
        }
      });
      onClose();
    };

    const handleRejectAll = () => {
      approvals.forEach((approval) => {
        if (approval.status === "pending") {
          onReject(approval.id);
        }
      });
      onClose();
    };

    return (
      <Dialog onClose={onClose} title="Tool Approval Required">
        <div className="flex max-h-[70vh] w-[600px] flex-col">
          {/* Header Info */}
          <div className="border-border border-b bg-secondary-bg px-4 py-3">
            <p className="text-sm text-text-lighter">
              {approvals.length === 1
                ? "The agent wants to run a tool that requires your approval."
                : `The agent wants to run ${approvals.length} tools that require your approval.`}
            </p>
          </div>

          {/* Approvals List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {approvals.map((approval, index) => (
              <div
                key={approval.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  approval.status === "pending"
                    ? "border-border bg-secondary-bg"
                    : approval.status === "approved"
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/30 bg-red-500/5",
                )}
              >
                {/* Tool Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-text-lighter text-xs">#{index + 1}</span>
                    <span
                      className="font-medium text-sm text-text"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {approval.toolName}
                    </span>
                    {approval.status !== "pending" && (
                      <span
                        className={cn(
                          "font-medium text-xs",
                          approval.status === "approved" ? "text-green-500" : "text-red-500",
                        )}
                      >
                        {approval.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
                    className="rounded-md p-1 text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text"
                    title={expandedId === approval.id ? "Collapse" : "Expand"}
                  >
                    <ChevronDown
                      size={14}
                      strokeWidth={1.5}
                      className={cn(
                        "transition-transform",
                        expandedId === approval.id && "rotate-180",
                      )}
                    />
                  </button>
                </div>

                {/* Tool Input - Expanded */}
                {expandedId === approval.id && (
                  <div className="border-border border-t px-3 pt-2 pb-3">
                    <div className="mb-1.5 text-text-lighter text-xs">Input Parameters:</div>
                    <pre
                      className="scrollbar-thin max-h-[200px] overflow-auto rounded border border-border bg-primary-bg p-2 text-text text-xs"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {JSON.stringify(approval.toolInput, null, 2)}
                    </pre>

                    {/* Action Buttons - Only for pending approvals */}
                    {approval.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600"
                        >
                          <Check size={14} strokeWidth={2} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-600"
                        >
                          <X size={14} strokeWidth={2} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          {approvals.some((a) => a.status === "pending") && approvals.length > 1 && (
            <div className="border-border border-t bg-secondary-bg px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={handleApproveAll}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-500 px-4 py-2 text-sm text-white transition-colors hover:bg-green-600"
                >
                  <Check size={14} strokeWidth={2} />
                  Approve All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
                >
                  <X size={14} strokeWidth={2} />
                  Reject All
                </button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    );
  },
);

ToolApprovalDialog.displayName = "ToolApprovalDialog";
