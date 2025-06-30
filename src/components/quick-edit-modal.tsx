import React, { useState, useRef, useEffect } from "react";
import { Bot, Loader2, X } from "lucide-react";
import { getProviderApiToken } from "../utils/ai-chat";
import { AI_PROVIDERS, getModelById } from "../types/ai-provider";

interface QuickEditInlineProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyEdit: (editedText: string) => void;
  selectedText: string;
  cursorPosition: { x: number; y: number };
  filename?: string;
  language?: string;
}

const QuickEditInline = ({
  isOpen,
  onClose,
  onApplyEdit,
  selectedText,
  cursorPosition,
  filename,
  language,
}: QuickEditInlineProps) => {
  const [instruction, setInstruction] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInstruction("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    // Position the component near the cursor
    if (isOpen && containerRef.current) {
      const container = containerRef.current;
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let left = cursorPosition.x;
      let top = cursorPosition.y + 20; // Slightly below cursor

      // Adjust if would go off screen
      if (left + 300 > viewport.width) {
        left = viewport.width - 320;
      }
      if (top + 100 > viewport.height) {
        top = cursorPosition.y - 120; // Above cursor instead
      }

      container.style.left = `${Math.max(10, left)}px`;
      container.style.top = `${Math.max(10, top)}px`;
    }
  }, [isOpen, cursorPosition]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleClose = () => {
    setIsStreaming(false);
    onClose();
  };

  const handleEdit = async () => {
    if (!instruction.trim() || isStreaming) return;

    setIsStreaming(true);

    try {
      // Get stored provider and model settings
      const storedProvider =
        localStorage.getItem("ai-chat-provider") || "openai";
      const storedModel =
        localStorage.getItem("ai-chat-model") || "gpt-3.5-turbo";

      const provider = AI_PROVIDERS.find(p => p.id === storedProvider);
      const model = provider ? getModelById(provider.id, storedModel) : null;

      if (!provider || !model) {
        throw new Error("No AI provider or model configured");
      }

      // Simple, direct API call
      const apiKey = await getProviderApiToken(provider.id);
      if (!apiKey) {
        throw new Error("API key not found");
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `Edit this code according to the instruction.

File: ${filename || "unknown"} (${language || "text"})
Instruction: ${instruction}

Current code:
${selectedText}

Return only the edited code, nothing else:`,
              },
            ],
            max_tokens: 1000,
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const editedText = result.choices[0].message.content.trim();

      console.log("✅ AI response:", editedText);

      if (editedText) {
        onApplyEdit(editedText);
        onClose();
      } else {
        throw new Error("No response from AI");
      }
    } catch (error) {
      console.error("❌ Error during AI edit:", error);
      // TODO: Show error feedback in UI instead of alert
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-[var(--bg-color)] !bg-white border border-[var(--border-color)] rounded-lg shadow-lg"
      style={{
        minWidth: "300px",
        maxWidth: "400px",
      }}
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex items-center gap-2 flex-1">
          <Bot size={14} className="text-[var(--text-lighter)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell AI what to do with the selected text..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs text-[var(--text-color)] placeholder-[var(--text-lighter)] border-none outline-none"
          />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isStreaming ? (
            <Loader2
              size={14}
              className="text-[var(--text-lighter)] animate-spin"
            />
          ) : (
            <div className="text-xs text-[var(--text-lighter)] font-mono">
              {selectedText.length}ch
            </div>
          )}
          <button
            onClick={handleClose}
            className="text-[var(--text-lighter)] hover:text-[var(--text-color)] transition-colors p-1"
            disabled={isStreaming}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Subtle hint */}
      <div className="px-3 pb-2">
        <div className="text-xs text-[var(--text-lighter)] font-mono">
          Press Enter to edit • Esc to cancel
        </div>
      </div>
    </div>
  );
};

export default QuickEditInline;
