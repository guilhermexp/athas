import { memo } from "react";
import { useAIChatStore } from "@/stores/ai-chat/store";
import type { ChatMode, OutputStyle } from "@/stores/ai-chat/types";
import { cn } from "@/utils/cn";
import Dropdown from "../ui/dropdown";

interface ModeSelectorProps {
  className?: string;
}

const modeOptions = [
  { value: "chat" as ChatMode, label: "Chat" },
  { value: "plan" as ChatMode, label: "Plan" },
];

const outputStyleOptions = [
  { value: "default" as OutputStyle, label: "Default" },
  { value: "explanatory" as OutputStyle, label: "Explanatory" },
  { value: "learning" as OutputStyle, label: "Learning" },
];

export const ModeSelector = memo(function ModeSelector({ className }: ModeSelectorProps) {
  const activeAgentSession = useAIChatStore((state) => state.getActiveAgentSession());
  const activeAgentSessionId = useAIChatStore((state) => state.activeAgentSessionId);
  const setAgentMode = useAIChatStore((state) => state.setAgentMode);
  const setAgentOutputStyle = useAIChatStore((state) => state.setAgentOutputStyle);

  if (!activeAgentSession || !activeAgentSessionId) {
    return null;
  }

  const { mode, outputStyle } = activeAgentSession;

  const handleModeChange = (newMode: string) => {
    setAgentMode(activeAgentSessionId, newMode as ChatMode);
  };

  const handleOutputStyleChange = (newStyle: string) => {
    setAgentOutputStyle(activeAgentSessionId, newStyle as OutputStyle);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Dropdown
        value={mode}
        options={modeOptions}
        onChange={handleModeChange}
        size="xs"
        openDirection="up"
        className="min-w-16"
      />
      <Dropdown
        value={outputStyle}
        options={outputStyleOptions}
        onChange={handleOutputStyleChange}
        size="xs"
        openDirection="up"
        className="min-w-24"
      />
    </div>
  );
});
