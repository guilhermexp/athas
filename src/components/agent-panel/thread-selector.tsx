import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react";
import type React from "react";
import { memo, useMemo } from "react";
import type { Thread } from "@/components/agent-panel/types";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { cn } from "@/utils/cn";

export const ThreadSelector = memo(() => {
  const { threads, activeThreadId, ui, switchThread, deleteThread, setActiveView, setSearchQuery } =
    useAgentPanelStore();

  const filteredThreads = useMemo(() => {
    if (!ui.searchQuery?.trim()) {
      return threads;
    }
    const query = ui.searchQuery.toLowerCase();
    return threads.filter((thread) => {
      const titleMatch = thread.title.toLowerCase().includes(query);
      const messagesMatch = thread.messages.some((msg) =>
        msg.content.some((block) => block.text?.toLowerCase().includes(query)),
      );
      return titleMatch || messagesMatch;
    });
  }, [threads, ui.searchQuery]);

  if (ui.activeView !== "history") {
    return null;
  }

  const handleSelectThread = (threadId: string) => {
    switchThread(threadId);
  };

  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    deleteThread(threadId);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className="flex h-full flex-col bg-secondary-bg text-text"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <div className="flex items-center justify-between border-border/50 border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("thread")}
            className="rounded-md p-1.5 text-text-lighter/70 transition-colors hover:bg-hover/60 hover:text-text"
            title="Back to thread"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
          <div>
            <h3 className="font-semibold text-sm">Thread History</h3>
            <p className="text-[11px] text-text-lighter/70">
              Browse and reopen previous conversations
            </p>
          </div>
        </div>

        <input
          className="h-7 w-56 rounded-md border border-border/40 bg-primary-bg/40 px-2 text-text text-xs outline-none placeholder:text-text-lighter/60 focus:border-selected"
          placeholder="Search threads..."
          value={ui.searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredThreads.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-text-lighter/80">
            <div>
              <MessageSquare size={20} className="mx-auto mb-2 opacity-60" strokeWidth={1.5} />
              <div className="font-medium text-xs">No threads found</div>
              <div className="mt-1 text-xs opacity-70">Start a conversation to create one</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                onSelect={handleSelectThread}
                onDelete={handleDeleteThread}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ThreadSelector.displayName = "ThreadSelector";

// ============================================================================
// Thread Item Component
// ============================================================================

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  onSelect: (threadId: string) => void;
  onDelete: (e: React.MouseEvent, threadId: string) => void;
  formatDate: (date: Date) => string;
}

const ThreadItem = memo(({ thread, isActive, onSelect, onDelete, formatDate }: ThreadItemProps) => {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const preview = lastMessage?.content[0]?.text || "No messages";
  const previewText = preview.length > 60 ? `${preview.substring(0, 60)}...` : preview;

  return (
    <div
      onClick={() => onSelect(thread.id)}
      className={cn(
        "group relative mb-1 cursor-pointer rounded-md px-2.5 py-2 transition-colors",
        isActive ? "bg-selected text-text" : "text-text-lighter hover:bg-hover/50 hover:text-text",
      )}
    >
      {/* Thread Title */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div
          className="flex-1 truncate font-medium text-xs"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          {thread.title}
        </div>
        <div className="text-xs opacity-60">{formatDate(thread.updatedAt)}</div>
      </div>

      {/* Preview */}
      <div className="truncate text-xs opacity-70" style={{ fontFamily: "var(--font-ui)" }}>
        {previewText}
      </div>

      {/* Message Count */}
      <div className="mt-1 text-xs opacity-50">
        {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => onDelete(e, thread.id)}
        className="absolute top-2 right-2 rounded-md p-1 text-text-lighter/50 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-500 group-hover:opacity-100"
        title="Delete thread"
      >
        <Trash2 size={11} strokeWidth={1.5} />
      </button>
    </div>
  );
});

ThreadItem.displayName = "ThreadItem";
