# Agent Panel UI - Visual Guide

This guide provides ASCII mockups and descriptions of all the new UI elements.

---

## 1. Agent Panel Header - Status Indicators

```
┌──────────────────────────────────────────────────────────┐
│ [*] New Thread  [🔵 ⟳ Streaming]     [+] [≡] [⋮]       │
└──────────────────────────────────────────────────────────┘
```

**States:**

### Streaming (Blue)
```
[🔵 ⟳ Streaming]
```
- Blue background (#3b82f6/10)
- Spinning loader icon
- "Streaming" text

### Waiting for Approval (Yellow)
```
[🟡 ● Waiting (2)]
```
- Yellow background (#eab308/10)
- Pulsing dot
- Count of pending tools

### Ready/Idle (Green)
```
[🟢 ● Ready]
```
- Green background (#22c55e/10)
- Solid dot
- "Ready" text

---

## 2. Message Item - Loading States

### Skeleton Loader (Waiting for First Chunk)
```
┌────────────────────────────────────────────┐
│ Assistant                                  │
│                                            │
│ ⟳ Waiting for response...                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░       │
│                                            │
└────────────────────────────────────────────┘
```
- Animated pulsing bars (fade in/out)
- Blue spinning loader icon
- "Waiting for response..." text

### Typing Indicator (Streaming)
```
┌────────────────────────────────────────────┐
│ This is the streamed content from the      │
│ agent. It appears as it's being generated. │
│                                            │
│ ● ● ● Typing...                            │
└────────────────────────────────────────────┘
```
- Three blue dots with staggered pulse animation
- "Typing..." text in light gray

---

## 3. Agent Input - Send/Stop Button

### Ready to Send
```
┌──────────────────────────────────────────────────┐
│ Type your message here...                        │
│                                                  │
│                                                  │
│──────────────────────────────────────────────────│
│ [+]  Always Ask ▾              [▶]              │
└──────────────────────────────────────────────────┘
```
- Blue send icon (▶)
- Dark background
- Enabled and clickable

### Streaming (Stop)
```
┌──────────────────────────────────────────────────┐
│ Type your message here...                        │
│                                                  │
│                                                  │
│──────────────────────────────────────────────────│
│ [+]  Always Ask ▾              [■]              │
└──────────────────────────────────────────────────┘
```
- Red background (#ef4444)
- White stop square icon (■)
- Tooltip: "Stop streaming (Esc)"

### Cancelling
```
┌──────────────────────────────────────────────────┐
│ Type your message here...                        │
│                                                  │
│                                                  │
│──────────────────────────────────────────────────│
│ [+]  Always Ask ▾              [⟳]              │
└──────────────────────────────────────────────────┘
```
- Red background (slightly faded)
- White spinning circle
- Disabled (cursor: wait)

---

## 4. Tool Approval Dialog

```
┌─────────────────────────────────────────────────────────┐
│ Tool Approval Required                            [X]   │
├─────────────────────────────────────────────────────────┤
│ The agent wants to run 3 tools that require your       │
│ approval.                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ #1  read_file                               [▼] │   │
│ ├─────────────────────────────────────────────────┤   │
│ │ Input Parameters:                               │   │
│ │ {                                               │   │
│ │   "path": "/workspace/config.json"              │   │
│ │ }                                               │   │
│ │                                                 │   │
│ │     [✓ Approve]           [✗ Reject]           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ #2  write_file                              [▼] │   │
│ │ Pending                                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ #3  execute_command                         [▼] │   │
│ │ Pending                                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│     [✓ Approve All]           [✗ Reject All]           │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Queue number (#1, #2, #3)
- Tool name (monospace font)
- Expand/collapse button (▼/▲)
- JSON input viewer with syntax highlighting
- Individual approve/reject buttons (green/red)
- Footer with batch actions
- Auto-scrollable content area

**Expanded Tool Details:**
```
┌─────────────────────────────────────────────────┐
│ #1  read_file  ✓                            [▲] │
├─────────────────────────────────────────────────┤
│ Input Parameters:                    [📋 Copy] │
│ ┌─────────────────────────────────────────────┐ │
│ │ {                                           │ │
│ │   "path": "/workspace/config.json",         │ │
│ │   "encoding": "utf-8"                       │ │
│ │ }                                           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│     [✓ Approve]           [✗ Reject]           │
└─────────────────────────────────────────────────┘
```

**Status Colors:**
- **Pending:** White/gray background
- **Approved:** Green border and background tint
- **Rejected:** Red border and background tint

---

## 5. Tool Call Card - Execution Progress

### Pending Approval
```
┌─────────────────────────────────────────────────┐
│ 🔧 read_file                                [▼] │
│ Waiting for approval                            │
└─────────────────────────────────────────────────┘
```

### Running (Short Duration)
```
┌─────────────────────────────────────────────────┐
│ 🔧 read_file  ⟳                             [▼] │
│ Running... ▓▓▓▓▓▓▓░░░░░░░                       │
└─────────────────────────────────────────────────┘
```
- Spinning loader icon (⟳)
- Animated blue progress bar

### Running (Long Duration)
```
┌─────────────────────────────────────────────────┐
│ 🔧 execute_command  ⟳                       [▼] │
│ Running... (5s) ▓▓▓▓▓▓▓░░░░░░░                  │
│ ⚠ This operation may take a while...            │
└─────────────────────────────────────────────────┘
```
- Duration counter in seconds
- Yellow warning for >2s operations

### Complete
```
┌─────────────────────────────────────────────────┐
│ 🔧 read_file  ✓                             [▼] │
│ Completed in 234ms                              │
└─────────────────────────────────────────────────┘
```
- Green checkmark (✓)
- Execution time in milliseconds

### Error
```
┌─────────────────────────────────────────────────┐
│ 🔧 read_file  ✗                             [▼] │
│ Error                                           │
├─────────────────────────────────────────────────┤
│ Error:                               [📋 Copy] │
│ ┌─────────────────────────────────────────────┐ │
│ │ ENOENT: File not found                      │ │
│ │ /workspace/missing.json                     │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```
- Red X icon (✗)
- Red border and background
- Error message display

---

## 6. Toast Notifications

### Success Toast
```
┌──────────────────────────────────────┐
│ ✓  Message sent                  [X] │
└──────────────────────────────────────┘
```
- Green checkmark icon
- Green accent color
- Auto-dismiss after 2s

### Info Toast
```
┌──────────────────────────────────────┐
│ ℹ  Streaming cancelled           [X] │
└──────────────────────────────────────┘
```
- Blue info icon
- Blue accent color
- Auto-dismiss after 3s

### Error Toast
```
┌──────────────────────────────────────┐
│ ✗  Failed to send message        [X] │
└──────────────────────────────────────┘
```
- Red X icon
- Red accent color
- Auto-dismiss after 3s

### Toast with Action
```
┌──────────────────────────────────────┐
│ ⚠  Connection lost               [X] │
│                                      │
│                      [Retry]         │
└──────────────────────────────────────┘
```
- Yellow warning icon
- Action button on right
- Manual dismiss only (duration: 0)

**Toast Stack:**
```
                    ┌──────────────────┐
                    │ ✓  Tool approved │
                    └──────────────────┘
          ┌──────────────────┐
          │ ℹ  Streaming...  │
          └──────────────────┘
┌──────────────────┐
│ ✗  Failed to... │
└──────────────────┘
```
- Positioned bottom-right
- Stacks vertically
- Slide-in from right animation
- Slide-out to right on dismiss

---

## 7. Error Boundary

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│                   ┌────────┐                     │
│                   │   ⚠    │                     │
│                   └────────┘                     │
│                                                  │
│           Something went wrong                   │
│                                                  │
│  The Agent Panel encountered an unexpected       │
│  error. This is likely a bug in the application. │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ > Error Details                      [▼] │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│     [↻ Try Again]    [⟳ Reload Page]            │
│                                                  │
│  If the problem persists, please report this    │
│  issue on GitHub.                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Development Mode (Expanded Details):**
```
┌──────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐   │
│  │ ▼ Error Details                           │   │
│  ├──────────────────────────────────────────┤   │
│  │ Message:                                  │   │
│  │ ┌──────────────────────────────────────┐ │   │
│  │ │ Cannot read property 'map' of null   │ │   │
│  │ └──────────────────────────────────────┘ │   │
│  │                                          │   │
│  │ Stack:                                   │   │
│  │ ┌──────────────────────────────────────┐ │   │
│  │ │ at MessageThread (message-thread:42) │ │   │
│  │ │ at AgentPanel (agent-panel.tsx:67)   │ │   │
│  │ │ ...                                  │ │   │
│  │ └──────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 8. Complete Agent Panel Layout

```
┌────────────────────────────────────────────────────────────┐
│ [*] New Thread  [🟢 ● Ready]          [+] [≡] [⋮]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  You:                                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Can you read the config file and update the API key? │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Assistant:                                                │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔧 read_file  ✓                               [▼]    │ │
│  │ Completed in 123ms                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  I've read the config file. Let me update the API key.    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔧 write_file  ⟳                              [▼]    │ │
│  │ Running... (2s) ▓▓▓▓▓▓▓░░░░░░░                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ● ● ● Typing...                                          │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐│
│ │ Type your message...                                   ││
│ │                                                        ││
│ └────────────────────────────────────────────────────────┘│
│─────────────────────────────────────────────────────────────│
│ [+]  Always Ask ▾                           [■]           │
└────────────────────────────────────────────────────────────┘

                              ┌──────────────────────────┐
                              │ ℹ  Tool "read_file"     │
                              │    approved          [X]│
                              └──────────────────────────┘
```

---

## Color Reference

### Status Colors
- **Success/Complete:** `#22c55e` (Green)
- **Error/Failed:** `#ef4444` (Red)
- **Warning/Pending:** `#eab308` (Yellow)
- **Info/Running:** `#3b82f6` (Blue)
- **Neutral:** `#6b7280` (Gray)

### Background Tints
- Success: `#22c55e/10` (10% opacity)
- Error: `#ef4444/10`
- Warning: `#eab308/10`
- Info: `#3b82f6/10`

### Text Colors
- Primary: `var(--color-text)`
- Secondary: `var(--color-text-lighter)`
- Success: `#22c55e`
- Error: `#ef4444`
- Warning: `#eab308`
- Info: `#3b82f6`

---

## Animation Timings

### Transitions
- Button hover: `150ms ease`
- State changes: `200ms ease`
- Color changes: `150ms ease`

### Animations
- Pulse (dots): `1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite`
- Spin (loader): `1s linear infinite`
- Slide-in: `300ms ease-out`
- Slide-out: `300ms ease-in`

### Delays
- Typing dot 1: `0ms`
- Typing dot 2: `150ms`
- Typing dot 3: `300ms`

---

## Responsive Behavior

### Mobile/Small Screens
- Tool approval dialog: Full width, scrollable
- Toast notifications: Full width, bottom of screen
- Status badges: Icon only, no text

### Desktop/Large Screens
- Tool approval dialog: 600px width, centered
- Toast notifications: 320px width, bottom-right
- Status badges: Icon + text, full display

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message (if not modifier required) |
| `Cmd/Ctrl + Enter` | Send message (if modifier required) |
| `Shift + Enter` | New line in textarea |
| `Esc` | Cancel streaming |
| `Tab` | Navigate through interactive elements |

---

## Icon Legend

| Icon | Meaning |
|------|---------|
| ⟳ | Loading/Spinning |
| ● | Status indicator dot |
| ✓ | Success/Complete |
| ✗ | Error/Failed |
| ⚠ | Warning |
| ℹ | Information |
| 🔧 | Tool |
| ▶ | Send/Play |
| ■ | Stop |
| ▼ | Expand |
| ▲ | Collapse |
| [X] | Close |
| 📋 | Copy |
| [+] | Add/Attach |

---

## User Flows

### Flow 1: Sending a Message
1. User types in textarea
2. Clicks send button (▶) or presses Enter
3. Toast: "Message sent" ✓
4. Header status: [🔵 ⟳ Streaming]
5. Message skeleton appears
6. Content streams in with typing indicator ● ● ●
7. Header status: [🟢 ● Ready]
8. Message complete

### Flow 2: Canceling Streaming
1. Agent is streaming (Red ■ button visible)
2. User clicks stop button or presses Esc
3. Button shows spinner ⟳
4. Request cancelled
5. Toast: "Streaming cancelled" ℹ
6. Message shows "[Cancelled by user]"
7. Header status: [🟢 ● Ready]

### Flow 3: Tool Approval
1. Agent requests tool execution
2. Header status: [🟡 ● Waiting (1)]
3. Tool approval dialog appears
4. User reviews tool name + JSON input
5. User clicks "Approve" ✓
6. Dialog closes
7. Toast: "Tool 'read_file' approved" ✓
8. Tool card shows: Running... ⟳ with progress bar
9. Tool completes: Completed in 234ms ✓
10. Header status: [🟢 ● Ready]

### Flow 4: Error Recovery
1. Component throws error
2. Error boundary catches it
3. Shows error UI with ⚠ icon
4. User clicks "Try Again"
5. Component re-renders
6. If successful: Normal operation resumes
7. If fails again: Shows error UI again

---

**Last Updated:** 2025-10-07
**Purpose:** Visual reference for Agent Panel UI improvements
