import { Bot, MessageSquare, Plus } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAIChatStore } from "../../stores/ai-chat-store";
import { usePersistentSettingsStore } from "../../stores/persistent-settings-store";
import { AI_PROVIDERS, getProviderById } from "../../types/ai-provider";
import {
  getChatCompletionStream,
  getProviderApiToken,
  removeProviderApiToken,
  storeProviderApiToken,
  validateProviderApiKey,
} from "../../utils/ai-chat";
import { cn } from "../../utils/cn";
import ApiKeyModal from "../api-key-modal";
import AIChatInputBar from "./ai-chat-input-bar";
import ChatHistoryModal from "./chat-history-modal";
import MarkdownRenderer from "./markdown-renderer";
import { parseMentionsAndLoadFiles } from "./mention-utils";
import ToolCallDisplay from "./tool-call-display";
import type { AIChatProps, Chat, ContextInfo, Message } from "./types";
import { formatTime } from "./utils";

export default function AIChat({
  className,
  activeBuffer,
  buffers = [],
  rootFolderPath,
  selectedFiles = [],
  allProjectFiles = [],
  mode: _,
  onApplyCode,
}: AIChatProps) {
  // Chat History State
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isChatHistoryVisible, setIsChatHistoryVisible] = useState(false);

  // Provider and Model State from persistent store
  const { aiProviderId, aiModelId, setAIProviderAndModel } = usePersistentSettingsStore();
  const [providerApiKeys, setProviderApiKeys] = useState<Map<string, boolean>>(new Map());
  const [apiKeyModalState, setApiKeyModalState] = useState<{
    isOpen: boolean;
    providerId: string | null;
  }>({ isOpen: false, providerId: null });

  // Get state and actions from AI chat store
  const {
    input,
    selectedBufferIds,
    hasApiKey,
    setInput,
    setIsTyping,
    setStreamingMessageId,
    setSelectedBufferIds,
    setHasApiKey,
  } = useAIChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current chat
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = useMemo(() => currentChat?.messages || [], [currentChat?.messages]);

  // Theme detection removed - was causing unnecessary re-renders

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("athas-code-ai-chats");
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          lastMessageAt: new Date(chat.lastMessageAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            toolCalls: msg.toolCalls?.map((tc: any) => ({
              ...tc,
              timestamp: new Date(tc.timestamp),
            })),
          })),
        }));
        setChats(parsedChats);

        // Set the most recent chat as current
        if (parsedChats.length > 0) {
          const mostRecent = parsedChats.sort(
            (a: Chat, b: Chat) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
          )[0];
          setCurrentChatId(mostRecent.id);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    }
  }, []);

  // Save chats to localStorage whenever chats change (debounced)
  useEffect(() => {
    if (chats.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("athas-code-ai-chats", JSON.stringify(chats));
      }, 1000); // Debounce localStorage writes by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [chats]);

  // Create a new chat
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsChatHistoryVisible(false);
  };

  // Switch to a different chat
  const switchToChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setIsChatHistoryVisible(false);
    // Stop any current streaming
    stopStreaming();
  };

  // Delete a chat
  const deleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setChats(prev => prev.filter(chat => chat.id !== chatId));

    // If we deleted the current chat, switch to the most recent one or create new
    if (chatId === currentChatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        const mostRecent = remainingChats.sort(
          (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
        )[0];
        setCurrentChatId(mostRecent.id);
      } else {
        setCurrentChatId(null);
      }
    }
  };

  // Update chat title based on first message
  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.length > 50 ? `${firstMessage.substring(0, 50)}...` : firstMessage;

    setChats(prev => prev.map(chat => (chat.id === chatId ? { ...chat, title } : chat)));
  };

  // Update messages in current chat
  const updateMessages = (newMessages: Message[]) => {
    if (!currentChatId) return;

    setChats(prev =>
      prev.map(chat =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: newMessages,
              lastMessageAt: new Date(),
            }
          : chat,
      ),
    );
  };

  const checkApiKey = useCallback(async () => {
    try {
      // Claude Code doesn't require an API key in the frontend
      if (aiProviderId === "claude-code") {
        setHasApiKey(true);
        return;
      }

      const token = await getProviderApiToken(aiProviderId);
      setHasApiKey(!!token);
    } catch (error) {
      console.error("Error checking API key:", error);
      setHasApiKey(false);
    }
  }, [aiProviderId]);

  const checkAllProviderApiKeys = useCallback(async () => {
    const newApiKeyMap = new Map<string, boolean>();

    for (const provider of AI_PROVIDERS) {
      try {
        // Claude Code doesn't require an API key in the frontend
        if (provider.id === "claude-code") {
          newApiKeyMap.set(provider.id, true);
          continue;
        }

        const token = await getProviderApiToken(provider.id);
        newApiKeyMap.set(provider.id, !!token);
      } catch (_error) {
        newApiKeyMap.set(provider.id, false);
      }
    }

    setProviderApiKeys(newApiKeyMap);
  }, []);

  // Check for API key on mount
  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  // Auto-select active buffer when it changes
  useEffect(() => {
    if (activeBuffer) {
      setSelectedBufferIds(new Set([...selectedBufferIds, activeBuffer.id]));
    }
  }, [activeBuffer, selectedBufferIds, setSelectedBufferIds]);

  // Check for API key on mount and when provider changes
  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  // Check all provider API keys on mount
  useEffect(() => {
    checkAllProviderApiKeys();
  }, [checkAllProviderApiKeys]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get selected buffers for context (memoized)
  const getSelectedBuffers = useMemo(() => {
    return buffers.filter(buffer => selectedBufferIds.has(buffer.id));
  }, [buffers, selectedBufferIds]);

  // Build context information for the AI (memoized)
  const buildContext = useMemo((): ContextInfo => {
    const context: ContextInfo = {
      activeBuffer: activeBuffer || undefined,
      openBuffers: getSelectedBuffers,
      selectedFiles,
      projectRoot: rootFolderPath,
      providerId: aiProviderId,
    };

    if (activeBuffer) {
      // Determine language from file extension
      const extension = activeBuffer.path.split(".").pop()?.toLowerCase() || "";
      const languageMap: Record<string, string> = {
        js: "JavaScript",
        jsx: "JavaScript (React)",
        ts: "TypeScript",
        tsx: "TypeScript (React)",
        py: "Python",
        rs: "Rust",
        go: "Go",
        java: "Java",
        cpp: "C++",
        c: "C",
        css: "CSS",
        html: "HTML",
        json: "JSON",
        md: "Markdown",
        sql: "SQL",
        sh: "Shell Script",
        yml: "YAML",
        yaml: "YAML",
      };

      context.language = languageMap[extension] || "Text";
    }

    return context;
  }, [activeBuffer, getSelectedBuffers, selectedFiles, rootFolderPath, aiProviderId]);

  // Stop streaming response
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    setStreamingMessageId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !hasApiKey) return;

    // Create a new chat if we don't have one
    let chatId = currentChatId;
    if (!chatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };
      setChats(prev => [newChat, ...prev]);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    // Parse @ mentions and load referenced files
    const { processedMessage } = await parseMentionsAndLoadFiles(input.trim(), allProjectFiles);

    const context = buildContext;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(), // Show original message to user
      role: "user",
      timestamp: new Date(),
    };

    // Create initial assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isStreaming: true,
    };

    const newMessages = [...messages, userMessage, assistantMessage];
    updateMessages(newMessages);

    // Update chat title if this is the first message
    if (messages.length === 0) {
      updateChatTitle(chatId, userMessage.content);
    }

    setInput("");
    setIsTyping(true);
    setStreamingMessageId(assistantMessageId);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build conversation context - include previous messages for continuity
      // Filter out system messages to avoid the linter error
      const conversationContext = messages
        .filter(msg => msg.role !== "system")
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      // Use the processed message with file contents for the AI
      const enhancedMessage = processedMessage;
      let currentAssistantMessageId = assistantMessageId;

      await getChatCompletionStream(
        aiProviderId,
        aiModelId,
        enhancedMessage,
        context,
        // onChunk - update the streaming message
        (chunk: string) => {
          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === currentAssistantMessageId
                        ? { ...msg, content: msg.content + chunk }
                        : msg,
                    ),
                  }
                : chat,
            ),
          );
        },
        // onComplete - mark streaming as finished
        () => {
          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === currentAssistantMessageId ? { ...msg, isStreaming: false } : msg,
                    ),
                    lastMessageAt: new Date(),
                  }
                : chat,
            ),
          );
          setIsTyping(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
        },
        // onError - handle errors
        (error: string) => {
          console.error("Streaming error:", error);
          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === currentAssistantMessageId
                        ? {
                            ...msg,
                            content: msg.content || `Error: ${error}`,
                            isStreaming: false,
                          }
                        : msg,
                    ),
                  }
                : chat,
            ),
          );
          setIsTyping(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
        },
        conversationContext, // Pass conversation history for context
        // onNewMessage - create a new assistant message
        () => {
          const newMessageId = Date.now().toString();
          const newAssistantMessage: Message = {
            id: newMessageId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: true,
          };

          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: [...chat.messages, newAssistantMessage],
                  }
                : chat,
            ),
          );

          // Update the current message ID to append chunks to the new message
          currentAssistantMessageId = newMessageId;
          setStreamingMessageId(newMessageId);
        },
        // onToolUse - mark the current message as tool use
        (toolName: string, toolInput?: any) => {
          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === currentAssistantMessageId
                        ? {
                            ...msg,
                            isToolUse: true,
                            toolName,
                            toolCalls: [
                              ...(msg.toolCalls || []),
                              {
                                name: toolName,
                                input: toolInput,
                                timestamp: new Date(),
                              },
                            ],
                          }
                        : msg,
                    ),
                  }
                : chat,
            ),
          );
        },
        // onToolComplete - mark tool as complete
        (toolName: string) => {
          setChats(prev =>
            prev.map(chat =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map(msg =>
                      msg.id === currentAssistantMessageId
                        ? {
                            ...msg,
                            toolCalls: msg.toolCalls?.map(tc =>
                              tc.name === toolName && !tc.isComplete
                                ? { ...tc, isComplete: true }
                                : tc,
                            ),
                          }
                        : msg,
                    ),
                  }
                : chat,
            ),
          );
        },
      );
    } catch (error) {
      console.error("Failed to start streaming:", error);
      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content:
                          "Error: Failed to connect to AI service. Please check your API key and try again.",
                        isStreaming: false,
                      }
                    : msg,
                ),
              }
            : chat,
        ),
      );
      setIsTyping(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  // Handle provider/model selection
  const handleProviderChange = (providerId: string, modelId: string) => {
    setAIProviderAndModel(providerId, modelId);
  };

  // Handle API key request
  const handleApiKeyRequest = (providerId: string) => {
    setApiKeyModalState({ isOpen: true, providerId });
  };

  // Check if provider has API key
  const hasProviderApiKey = (providerId: string): boolean => {
    return providerApiKeys.get(providerId) || false;
  };

  // Handle API key save
  const handleApiKeySave = async (providerId: string, apiKey: string): Promise<boolean> => {
    try {
      const isValid = await validateProviderApiKey(providerId, apiKey);
      if (isValid) {
        await storeProviderApiToken(providerId, apiKey);
        await checkAllProviderApiKeys(); // Refresh all keys
        await checkApiKey(); // Refresh current provider key
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error saving API key:", error);
      return false;
    }
  };

  // Handle API key removal
  const handleApiKeyRemove = async (providerId: string): Promise<void> => {
    try {
      await removeProviderApiToken(providerId);
      await checkAllProviderApiKeys(); // Refresh all keys
      await checkApiKey(); // Refresh current provider key
    } catch (error) {
      console.error("Error removing API key:", error);
      throw error;
    }
  };

  return (
    <div
      className={cn(
        "ai-chat-container flex h-full flex-col font-mono text-xs",
        "bg-primary-bg text-text",
        className,
      )}
      style={{
        background: "var(--primary-bg)",
        color: "var(--text-color)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "var(--secondary-bg)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <button
          onClick={() => setIsChatHistoryVisible(!isChatHistoryVisible)}
          className="rounded p-1 transition-colors hover:bg-hover"
          style={{ color: "var(--text-lighter)" }}
          title="Toggle chat history"
        >
          <MessageSquare size={14} />
        </button>
        <span className="font-medium">{currentChat ? currentChat.title : "New Chat"}</span>
        <div className="flex-1" />
        <button
          onClick={createNewChat}
          className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-hover"
          style={{ color: "var(--text-lighter)" }}
          title="New chat"
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Messages */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <Bot size={24} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">AI Assistant</div>
              <div className="mt-1" style={{ color: "var(--text-lighter)" }}>
                Ask me anything about your code
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          // Check if this is the first assistant message in a sequence
          const isFirstAssistantInSequence =
            message.role === "assistant" &&
            (index === 0 || messages[index - 1].role !== "assistant");

          return (
            <div
              key={message.id}
              className={`${message.role === "user" ? "flex justify-end p-3" : "p-3"}`}
            >
              {message.role === "user" ? (
                /* User Message - Subtle Chat Bubble */
                <div className="flex max-w-[80%] flex-col items-end">
                  <div
                    className="rounded-lg rounded-br-none px-3 py-2"
                    style={{
                      background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  </div>
                </div>
              ) : (
                /* Assistant Message - Full Width with Header */
                <div className="w-full">
                  {/* AI Message Header - Only show for first message in sequence */}
                  {isFirstAssistantInSequence && (
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="flex items-center gap-1"
                        style={{ color: "var(--text-lighter)" }}
                      >
                        <span>{getProviderById(aiProviderId)?.name || aiProviderId}</span>
                        {message.isStreaming && (
                          <div className="ml-1 flex items-center gap-1">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-text-lighter" />
                            <span
                              className="h-1 w-1 animate-pulse rounded-full bg-text-lighter"
                              style={{ animationDelay: "0.2s" }}
                            />
                            <span
                              className="h-1 w-1 animate-pulse rounded-full bg-text-lighter"
                              style={{ animationDelay: "0.4s" }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tool Calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {message.toolCalls!.map((toolCall, toolIndex) => (
                        <ToolCallDisplay
                          key={`${message.id}-tool-${toolIndex}`}
                          toolName={toolCall.name}
                          input={toolCall.input}
                          output={toolCall.output}
                          error={toolCall.error}
                          isStreaming={!toolCall.isComplete && message.isStreaming}
                        />
                      ))}
                    </div>
                  )}

                  {/* AI Message Content */}
                  {message.content && (
                    <div className="pr-1 leading-relaxed">
                      <MarkdownRenderer content={message.content} onApplyCode={onApplyCode} />

                      {message.isStreaming && (
                        <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[var(--text-lighter)]" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Chat Input Bar */}
      <AIChatInputBar
        buffers={buffers}
        allProjectFiles={allProjectFiles}
        rootFolderPath={rootFolderPath}
        onSendMessage={sendMessage}
        onStopStreaming={stopStreaming}
        onApiKeyRequest={handleApiKeyRequest}
        onProviderChange={handleProviderChange}
        hasProviderApiKey={hasProviderApiKey}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalState.isOpen}
        onClose={() => setApiKeyModalState({ isOpen: false, providerId: null })}
        providerId={apiKeyModalState.providerId || ""}
        onSave={handleApiKeySave}
        onRemove={handleApiKeyRemove}
        hasExistingKey={
          apiKeyModalState.providerId ? hasProviderApiKey(apiKeyModalState.providerId) : false
        }
      />

      {/* Chat History Modal */}
      <ChatHistoryModal
        isOpen={isChatHistoryVisible}
        onClose={() => setIsChatHistoryVisible(false)}
        chats={chats}
        currentChatId={currentChatId}
        onSwitchToChat={switchToChat}
        onDeleteChat={deleteChat}
        formatTime={formatTime}
      />
    </div>
  );
}
