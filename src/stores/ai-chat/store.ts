import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Chat } from "@/components/ai-chat/types";
import type { FileEntry } from "@/file-system/models/app";
import { AI_PROVIDERS } from "@/types/ai-provider";
import {
  getProviderApiToken,
  removeProviderApiToken,
  storeProviderApiToken,
  validateProviderApiKey,
} from "@/utils/ai-chat";
import type { AgentSession, AIChatActions, AIChatState } from "./types";

const createDefaultAgentSession = (name: string): AgentSession => ({
  id: Date.now().toString(),
  name,
  chats: [],
  currentChatId: null,
  input: "",
  isTyping: false,
  streamingMessageId: null,
  selectedBufferIds: new Set<string>(),
  selectedFilesPaths: new Set<string>(),
  isContextDropdownOpen: false,
  isSendAnimating: false,
  createdAt: new Date(),
  status: "idle",
  lastActivity: new Date(),
  messageQueue: [],
  isProcessingQueue: false,
});

export const useAIChatStore = create<AIChatState & AIChatActions>()(
  immer(
    persist(
      (set, get) => {
        const defaultSession = createDefaultAgentSession("Session 1");
        return {
          // Multi-agent state
          agentSessions: [defaultSession],
          activeAgentSessionId: defaultSession.id,

          // Global state
          hasApiKey: false,
          isChatHistoryVisible: false,

          providerApiKeys: new Map<string, boolean>(),
          apiKeyModalState: { isOpen: false, providerId: null },

          mentionState: {
            active: false,
            position: { top: 0, left: 0 },
            search: "",
            startIndex: 0,
            selectedIndex: 0,
          },

          // ─────────────────────────────────────────────────────────────────
          // Agent session actions
          // ─────────────────────────────────────────────────────────────────
          createAgentSession: (name) => {
            // Use AI provider name instead of generic "Agent"
            const sessionName = name || `Session ${get().agentSessions.length + 1}`;
            const newSession = createDefaultAgentSession(sessionName);
            set((state) => {
              state.agentSessions.push(newSession);
              state.activeAgentSessionId = newSession.id;
            });
            return newSession.id;
          },

          switchToAgentSession: (sessionId) =>
            set((state) => {
              state.activeAgentSessionId = sessionId;
            }),

          deleteAgentSession: (sessionId) =>
            set((state) => {
              const sessionIndex = state.agentSessions.findIndex((s) => s.id === sessionId);
              if (sessionIndex !== -1) {
                state.agentSessions.splice(sessionIndex, 1);

                // If we deleted the active session, switch to another one
                if (sessionId === state.activeAgentSessionId) {
                  if (state.agentSessions.length > 0) {
                    state.activeAgentSessionId = state.agentSessions[0].id;
                  } else {
                    // Create a new default session if no sessions left
                    const newSession = createDefaultAgentSession("Session 1");
                    state.agentSessions.push(newSession);
                    state.activeAgentSessionId = newSession.id;
                  }
                }
              }
            }),

          renameAgentSession: (sessionId, name) =>
            set((state) => {
              const session = state.agentSessions.find((s) => s.id === sessionId);
              if (session) {
                session.name = name;
              }
            }),

          getActiveAgentSession: () => {
            const state = get();
            return state.agentSessions.find((s) => s.id === state.activeAgentSessionId);
          },

          updateAgentStatus: (sessionId, status) =>
            set((state) => {
              const session = state.agentSessions.find((s) => s.id === sessionId);
              if (session) {
                session.status = status;
                session.lastActivity = new Date();
              }
            }),

          updateAgentActivity: (sessionId) =>
            set((state) => {
              const session = state.agentSessions.find((s) => s.id === sessionId);
              if (session) {
                session.lastActivity = new Date();
              }
            }),

          // ─────────────────────────────────────────────────────────────────
          // Message queue actions
          // ─────────────────────────────────────────────────────────────────
          addMessageToQueue: (sessionId, message) =>
            set((state) => {
              const session = state.agentSessions.find((s) => s.id === sessionId);
              if (session) {
                const queuedMessage = {
                  id: Date.now().toString(),
                  content: message,
                  timestamp: new Date(),
                };
                session.messageQueue.push(queuedMessage);
                session.lastActivity = new Date();
              }
            }),

          processNextMessage: (sessionId) => {
            const state = get();
            const session = state.agentSessions.find((s) => s.id === sessionId);
            if (session && session.messageQueue.length > 0) {
              const nextMessage = session.messageQueue[0];
              set((state) => {
                const session = state.agentSessions.find((s) => s.id === sessionId);
                if (session) {
                  session.messageQueue.shift();
                  session.isProcessingQueue = session.messageQueue.length > 0;
                }
              });
              return nextMessage;
            }
            return null;
          },

          clearMessageQueue: (sessionId) =>
            set((state) => {
              const session = state.agentSessions.find((s) => s.id === sessionId);
              if (session) {
                session.messageQueue = [];
                session.isProcessingQueue = false;
              }
            }),

          // ─────────────────────────────────────────────────────────────────
          // Input actions (for active session)
          // ─────────────────────────────────────────────────────────────────
          setInput: (input) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.input = input;
                activeSession.lastActivity = new Date();
                // Update status to typing if user is entering text
                if (input.trim() && activeSession.status === "idle") {
                  activeSession.status = "typing";
                } else if (!input.trim() && activeSession.status === "typing") {
                  activeSession.status = "idle";
                }
              }
            }),
          setIsTyping: (isTyping) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.isTyping = isTyping;
                activeSession.status = isTyping ? "responding" : "idle";
                activeSession.lastActivity = new Date();
              }
            }),
          setStreamingMessageId: (streamingMessageId) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.streamingMessageId = streamingMessageId;
              }
            }),
          toggleBufferSelection: (bufferId) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedBufferIds = new Set(activeSession.selectedBufferIds);
                if (activeSession.selectedBufferIds.has(bufferId)) {
                  activeSession.selectedBufferIds.delete(bufferId);
                } else {
                  activeSession.selectedBufferIds.add(bufferId);
                }
              }
            }),
          toggleFileSelection: (filePath) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedFilesPaths = new Set(activeSession.selectedFilesPaths);
                if (activeSession.selectedFilesPaths.has(filePath)) {
                  activeSession.selectedFilesPaths.delete(filePath);
                } else {
                  activeSession.selectedFilesPaths.add(filePath);
                }
              }
            }),
          setIsContextDropdownOpen: (isContextDropdownOpen) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.isContextDropdownOpen = isContextDropdownOpen;
              }
            }),
          setIsSendAnimating: (isSendAnimating) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.isSendAnimating = isSendAnimating;
              }
            }),
          setHasApiKey: (hasApiKey) =>
            set((state) => {
              state.hasApiKey = hasApiKey;
            }),
          clearSelectedBuffers: () =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedBufferIds = new Set<string>();
              }
            }),
          clearSelectedFiles: () =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedFilesPaths = new Set<string>();
              }
            }),
          setSelectedBufferIds: (selectedBufferIds) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedBufferIds = selectedBufferIds;
              }
            }),
          setSelectedFilesPaths: (selectedFilesPaths) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.selectedFilesPaths = selectedFilesPaths;
              }
            }),
          autoSelectBuffer: (bufferId) =>
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession && !activeSession.selectedBufferIds.has(bufferId)) {
                activeSession.selectedBufferIds = new Set(activeSession.selectedBufferIds);
                activeSession.selectedBufferIds.add(bufferId);
              }
            }),

          // ─────────────────────────────────────────────────────────────────
          // Chat actions (for active session)
          // ─────────────────────────────────────────────────────────────────
          createNewChat: () => {
            const newChat: Chat = {
              id: Date.now().toString(),
              title: "New Chat",
              messages: [],
              createdAt: new Date(),
              lastMessageAt: new Date(),
            };
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.chats.unshift(newChat);
                activeSession.currentChatId = newChat.id;
                state.isChatHistoryVisible = false;
              }
            });
            return newChat.id;
          },

          switchToChat: (chatId) => {
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                activeSession.currentChatId = chatId;
                state.isChatHistoryVisible = false;
              }
            });
            // Stop any streaming when switching chats
            const state = get();
            const activeSession = state.agentSessions.find(
              (s) => s.id === state.activeAgentSessionId,
            );
            if (activeSession?.streamingMessageId) {
              set((state) => {
                const session = state.agentSessions.find(
                  (s) => s.id === state.activeAgentSessionId,
                );
                if (session) {
                  session.isTyping = false;
                  session.streamingMessageId = null;
                }
              });
            }
          },

          deleteChat: (chatId) => {
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                const chatIndex = activeSession.chats.findIndex((chat) => chat.id === chatId);
                if (chatIndex !== -1) {
                  activeSession.chats.splice(chatIndex, 1);
                }

                // If we deleted the current chat, switch to the most recent one
                if (chatId === activeSession.currentChatId) {
                  if (activeSession.chats.length > 0) {
                    const mostRecent = [...activeSession.chats].sort(
                      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
                    )[0];
                    activeSession.currentChatId = mostRecent.id;
                  } else {
                    activeSession.currentChatId = null;
                  }
                }
              }
            });
          },

          updateChatTitle: (chatId, title) => {
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                const chat = activeSession.chats.find((c) => c.id === chatId);
                if (chat) {
                  chat.title = title;
                }
              }
            });
          },

          addMessage: (chatId, message) => {
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                const chat = activeSession.chats.find((c) => c.id === chatId);
                if (chat) {
                  chat.messages.push(message);
                  chat.lastMessageAt = new Date();
                }
              }
            });
          },

          updateMessage: (chatId, messageId, updates) => {
            set((state) => {
              const activeSession = state.agentSessions.find(
                (s) => s.id === state.activeAgentSessionId,
              );
              if (activeSession) {
                const chat = activeSession.chats.find((c) => c.id === chatId);
                if (chat) {
                  const message = chat.messages.find((m) => m.id === messageId);
                  if (message) {
                    Object.assign(message, updates);
                    chat.lastMessageAt = new Date();
                  }
                }
              }
            });
          },

          regenerateResponse: () => {
            const state = get();
            const activeSession = state.agentSessions.find(
              (s) => s.id === state.activeAgentSessionId,
            );
            if (!activeSession || !activeSession.currentChatId) return null;

            const chat = activeSession.chats.find((c) => c.id === activeSession.currentChatId);
            if (!chat || chat.messages.length === 0) return null;

            // Find the last user message
            let lastUserMessageIndex = -1;
            for (let i = chat.messages.length - 1; i >= 0; i--) {
              if (chat.messages[i].role === "user") {
                lastUserMessageIndex = i;
                break;
              }
            }

            if (lastUserMessageIndex === -1) return null;

            const lastUserMessage = chat.messages[lastUserMessageIndex];

            set((state) => {
              const session = state.agentSessions.find((s) => s.id === state.activeAgentSessionId);
              if (session) {
                const currentChat = session.chats.find((c) => c.id === session.currentChatId);
                if (currentChat) {
                  // Remove all messages after the last user message
                  currentChat.messages.splice(lastUserMessageIndex + 1);
                  currentChat.lastMessageAt = new Date();
                }
              }
            });

            return lastUserMessage.content;
          },

          setIsChatHistoryVisible: (isChatHistoryVisible) =>
            set((state) => {
              state.isChatHistoryVisible = isChatHistoryVisible;
            }),

          // ─────────────────────────────────────────────────────────────────
          // Provider API key actions
          // ─────────────────────────────────────────────────────────────────
          setApiKeyModalState: (apiKeyModalState) =>
            set((state) => {
              state.apiKeyModalState = apiKeyModalState;
            }),

          checkApiKey: async (providerId) => {
            try {
              // Claude Code doesn't require an API key in the frontend
              if (providerId === "claude-code") {
                set((state) => {
                  state.hasApiKey = true;
                });
                return;
              }

              const token = await getProviderApiToken(providerId);
              set((state) => {
                state.hasApiKey = !!token;
              });
            } catch (error) {
              console.error("Error checking API key:", error);
              set((state) => {
                state.hasApiKey = false;
              });
            }
          },

          checkAllProviderApiKeys: async () => {
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
              } catch {
                newApiKeyMap.set(provider.id, false);
              }
            }

            set((state) => {
              state.providerApiKeys = newApiKeyMap;
            });
          },

          saveApiKey: async (providerId, apiKey) => {
            try {
              const isValid = await validateProviderApiKey(providerId, apiKey);
              if (isValid) {
                await storeProviderApiToken(providerId, apiKey);

                // Manually update provider keys after saving
                const newApiKeyMap = new Map<string, boolean>();
                for (const provider of AI_PROVIDERS) {
                  try {
                    if (provider.id === "claude-code") {
                      newApiKeyMap.set(provider.id, true);
                      continue;
                    }
                    const token = await getProviderApiToken(provider.id);
                    newApiKeyMap.set(provider.id, !!token);
                  } catch {
                    newApiKeyMap.set(provider.id, false);
                  }
                }
                set((state) => {
                  state.providerApiKeys = newApiKeyMap;
                });

                // Update hasApiKey for current provider
                if (providerId === "claude-code") {
                  set((state) => {
                    state.hasApiKey = true;
                  });
                } else {
                  const token = await getProviderApiToken(providerId);
                  set((state) => {
                    state.hasApiKey = !!token;
                  });
                }

                return true;
              }
              return false;
            } catch (error) {
              console.error("Error saving API key:", error);
              return false;
            }
          },

          removeApiKey: async (providerId) => {
            try {
              await removeProviderApiToken(providerId);

              // Manually update provider keys after removing
              const newApiKeyMap = new Map<string, boolean>();
              for (const provider of AI_PROVIDERS) {
                try {
                  if (provider.id === "claude-code") {
                    newApiKeyMap.set(provider.id, true);
                    continue;
                  }
                  const token = await getProviderApiToken(provider.id);
                  newApiKeyMap.set(provider.id, !!token);
                } catch {
                  newApiKeyMap.set(provider.id, false);
                }
              }
              set((state) => {
                state.providerApiKeys = newApiKeyMap;
              });

              // Update hasApiKey for current provider
              if (providerId === "claude-code") {
                set((state) => {
                  state.hasApiKey = true;
                });
              } else {
                set((state) => {
                  state.hasApiKey = false;
                });
              }
            } catch (error) {
              console.error("Error removing API key:", error);
              throw error;
            }
          },

          hasProviderApiKey: (providerId) => {
            return get().providerApiKeys.get(providerId) || false;
          },

          // ─────────────────────────────────────────────────────────────────
          // Mention actions
          // ─────────────────────────────────────────────────────────────────
          showMention: (position, search, startIndex) =>
            set((state) => {
              state.mentionState = {
                active: true,
                position,
                search,
                startIndex,
                selectedIndex: 0,
              };
            }),

          hideMention: () =>
            set((state) => {
              state.mentionState = {
                active: false,
                position: { top: 0, left: 0 },
                search: "",
                startIndex: 0,
                selectedIndex: 0,
              };
            }),

          updateSearch: (search) =>
            set((state) => {
              state.mentionState.search = search;
              state.mentionState.selectedIndex = 0;
            }),

          updatePosition: (position) =>
            set((state) => {
              state.mentionState.position = position;
            }),

          selectNext: () =>
            set((state) => {
              state.mentionState.selectedIndex = Math.min(state.mentionState.selectedIndex + 1, 4);
            }),

          selectPrevious: () =>
            set((state) => {
              state.mentionState.selectedIndex = Math.max(state.mentionState.selectedIndex - 1, 0);
            }),

          setSelectedIndex: (index) =>
            set((state) => {
              state.mentionState.selectedIndex = index;
            }),

          getFilteredFiles: (allFiles) => {
            const { search } = get().mentionState;
            const query = search.toLowerCase();

            if (!query) return allFiles.filter((file: FileEntry) => !file.isDir).slice(0, 5);

            const scored = allFiles
              .filter((file: FileEntry) => !file.isDir)
              .map((file: FileEntry) => {
                const name = file.name.toLowerCase();
                const path = file.path.toLowerCase();

                // Score based on match quality
                let score = 0;
                if (name === query) score = 100;
                else if (name.startsWith(query)) score = 80;
                else if (name.includes(query)) score = 60;
                else if (path.includes(query)) score = 40;
                else return null;

                return { file, score };
              })
              .filter(Boolean) as { file: FileEntry; score: number }[];

            return scored
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(({ file }) => file);
          },

          // ─────────────────────────────────────────────────────────────────
          // Helper getters (for active session)
          // ─────────────────────────────────────────────────────────────────
          getCurrentChat: () => {
            const state = get();
            const activeSession = state.agentSessions.find(
              (s) => s.id === state.activeAgentSessionId,
            );
            if (!activeSession) return undefined;
            return activeSession.chats.find((chat) => chat.id === activeSession.currentChatId);
          },

          getCurrentMessages: () => {
            const state = get();
            const activeSession = state.agentSessions.find(
              (s) => s.id === state.activeAgentSessionId,
            );
            if (!activeSession) return [];
            const chat = activeSession.chats.find(
              (chat) => chat.id === activeSession.currentChatId,
            );
            return chat?.messages || [];
          },
        };
      },
      {
        name: "athas-ai-chat-v3",
        version: 1,
        partialize: (state) => ({
          // Only persist agent sessions and active session
          agentSessions: state.agentSessions,
          activeAgentSessionId: state.activeAgentSessionId,
        }),
        merge: (persistedState, currentState) =>
          produce(currentState, (draft) => {
            // Merge persisted state into draft
            Object.assign(draft, persistedState);
            // Convert date strings back to Date objects
            if (draft.agentSessions) {
              draft.agentSessions.forEach((session) => {
                session.createdAt = new Date(session.createdAt);
                session.lastActivity = new Date(session.lastActivity || session.createdAt);
                // Ensure status exists (for backward compatibility)
                if (!session.status) {
                  session.status = "idle";
                }
                // Ensure queue fields exist (for backward compatibility)
                if (!session.messageQueue) {
                  session.messageQueue = [];
                }
                if (session.isProcessingQueue === undefined) {
                  session.isProcessingQueue = false;
                }
                // Restore Sets from arrays
                session.selectedBufferIds = new Set(session.selectedBufferIds);
                session.selectedFilesPaths = new Set(session.selectedFilesPaths);
                // Restore Date objects for queued messages
                if (session.messageQueue) {
                  session.messageQueue.forEach((msg) => {
                    msg.timestamp = new Date(msg.timestamp);
                  });
                }
                session.chats.forEach((chat) => {
                  chat.createdAt = new Date(chat.createdAt);
                  chat.lastMessageAt = new Date(chat.lastMessageAt);
                  chat.messages.forEach((msg) => {
                    msg.timestamp = new Date(msg.timestamp);
                    if (msg.toolCalls) {
                      msg.toolCalls.forEach((tc) => {
                        tc.timestamp = new Date(tc.timestamp);
                      });
                    }
                  });
                });
              });
            }
            // Set active session if none selected
            if (!draft.activeAgentSessionId && draft.agentSessions.length > 0) {
              draft.activeAgentSessionId = draft.agentSessions[0].id;
            }
          }),
      },
    ),
  ),
);
