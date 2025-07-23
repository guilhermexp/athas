import type { EditorAPI, EditorExtension } from "./extension-types";

export const basicEditingExtension: EditorExtension = {
  name: "Basic Editing",
  version: "1.0.0",
  description: "Provides basic editing functionality like tab handling and common shortcuts",

  commands: [
    {
      id: "editor.indent",
      name: "Indent",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const selection = editor.getSelection();
        const tabSize = editor.getSettings().tabSize;
        const spaces = " ".repeat(tabSize);

        if (selection && selection.start.line !== selection.end.line) {
          // Multi-line selection: indent all selected lines
          const startLine = selection.start.line;
          const endLine = selection.end.line;

          for (let i = startLine; i <= endLine; i++) {
            const line = editor.getLine(i);
            if (line !== undefined) {
              const newContent = spaces + line;
              editor.replaceRange(
                {
                  start: { line: i, column: 0, offset: 0 },
                  end: { line: i, column: line.length, offset: 0 },
                },
                newContent,
              );
            }
          }
        } else {
          // Single position or single line: insert tab at cursor
          editor.insertText(spaces);
        }
      },
    },
    {
      id: "editor.outdent",
      name: "Outdent",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const selection = editor.getSelection();
        const tabSize = editor.getSettings().tabSize;

        if (selection && selection.start.line !== selection.end.line) {
          // Multi-line selection: outdent all selected lines
          const startLine = selection.start.line;
          const endLine = selection.end.line;

          for (let i = startLine; i <= endLine; i++) {
            const line = editor.getLine(i);
            if (line !== undefined) {
              // Remove leading spaces up to tabSize
              let spacesToRemove = 0;
              for (let j = 0; j < Math.min(tabSize, line.length); j++) {
                if (line[j] === " ") {
                  spacesToRemove++;
                } else {
                  break;
                }
              }

              if (spacesToRemove > 0) {
                editor.replaceRange(
                  {
                    start: { line: i, column: 0, offset: 0 },
                    end: { line: i, column: spacesToRemove, offset: 0 },
                  },
                  "",
                );
              }
            }
          }
        }
      },
    },
    {
      id: "editor.deleteLine",
      name: "Delete Line",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const cursor = editor.getCursorPosition();
        const lines = editor.getLines();

        if (cursor.line < lines.length) {
          const lineStart = { line: cursor.line, column: 0, offset: 0 };
          const lineEnd =
            cursor.line < lines.length - 1
              ? { line: cursor.line + 1, column: 0, offset: 0 }
              : { line: cursor.line, column: lines[cursor.line].length, offset: 0 };

          editor.deleteRange({ start: lineStart, end: lineEnd });
        }
      },
    },
    {
      id: "editor.duplicateLine",
      name: "Duplicate Line",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const cursor = editor.getCursorPosition();
        const lines = editor.getLines();

        if (cursor.line < lines.length) {
          const line = lines[cursor.line];
          editor.insertText(`\n${line}`, {
            line: cursor.line,
            column: line.length,
            offset: 0,
          });
        }
      },
    },
    {
      id: "editor.moveLineUp",
      name: "Move Line Up",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const cursor = editor.getCursorPosition();
        if (cursor.line === 0) return;

        const lines = editor.getLines();
        const currentLine = lines[cursor.line];

        // Delete current line
        editor.deleteRange({
          start: { line: cursor.line, column: 0, offset: 0 },
          end: { line: cursor.line + 1, column: 0, offset: 0 },
        });

        // Insert at previous position
        editor.insertText(`${currentLine}\n`, {
          line: cursor.line - 1,
          column: 0,
          offset: 0,
        });

        // Update cursor position
        editor.setCursorPosition({
          line: cursor.line - 1,
          column: cursor.column,
          offset: cursor.offset,
        });
      },
    },
    {
      id: "editor.moveLineDown",
      name: "Move Line Down",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        const cursor = editor.getCursorPosition();
        const lines = editor.getLines();
        if (cursor.line >= lines.length - 1) return;

        const currentLine = lines[cursor.line];

        // Delete current line
        editor.deleteRange({
          start: { line: cursor.line, column: 0, offset: 0 },
          end: { line: cursor.line + 1, column: 0, offset: 0 },
        });

        // Insert after next line
        editor.insertText(`\n${currentLine}`, {
          line: cursor.line,
          column: lines[cursor.line].length,
          offset: 0,
        });

        // Update cursor position
        editor.setCursorPosition({
          line: cursor.line + 1,
          column: cursor.column,
          offset: cursor.offset,
        });
      },
    },
    {
      id: "editor.toggleComment",
      name: "Toggle Comment",
      execute: args => {
        const editor = args?.editor as EditorAPI;
        if (!editor) return;

        // TODO: Implement language-aware commenting
        // For now, use // for JavaScript-style comments
        const commentPrefix = "// ";
        const selection = editor.getSelection();
        const cursor = editor.getCursorPosition();

        const startLine = selection ? selection.start.line : cursor.line;
        const endLine = selection ? selection.end.line : cursor.line;

        for (let i = startLine; i <= endLine; i++) {
          const line = editor.getLine(i);
          if (line !== undefined) {
            if (line.trim().startsWith(commentPrefix)) {
              // Remove comment
              const index = line.indexOf(commentPrefix);
              editor.replaceRange(
                {
                  start: { line: i, column: index, offset: 0 },
                  end: { line: i, column: index + commentPrefix.length, offset: 0 },
                },
                "",
              );
            } else {
              // Add comment
              const leadingSpaces = line.length - line.trimStart().length;
              editor.insertText(commentPrefix, {
                line: i,
                column: leadingSpaces,
                offset: 0,
              });
            }
          }
        }
      },
    },
  ],

  keybindings: {
    Tab: "editor.indent",
    "Shift+Tab": "editor.outdent",
    "Ctrl+D": "editor.duplicateLine",
    "Ctrl+Shift+K": "editor.deleteLine",
    "Alt+Up": "editor.moveLineUp",
    "Alt+Down": "editor.moveLineDown",
    "Ctrl+/": "editor.toggleComment",
    "Cmd+D": "editor.duplicateLine",
    "Cmd+Shift+K": "editor.deleteLine",
    "Cmd+/": "editor.toggleComment",
  },

  initialize: (editor: EditorAPI) => {
    // Pass editor to command handlers
    const commands = basicEditingExtension.commands;
    if (commands) {
      commands.forEach(command => {
        const originalExecute = command.execute;
        command.execute = args => originalExecute({ ...args, editor });
      });
    }
  },
};
