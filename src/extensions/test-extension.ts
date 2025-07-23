import type { EditorExtension } from "./extension-types";

export const testExtension: EditorExtension = {
  name: "Test Extension",
  version: "1.0.0",
  description: "A test extension to verify the extension system works",

  initialize: editor => {
    console.log("Test extension initialized!");

    // Add a test decoration
    const decorationId = editor.addDecoration({
      range: {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 5, offset: 5 },
      },
      type: "inline",
      className: "test-highlight",
    });

    console.log("Added test decoration:", decorationId);
  },

  dispose: () => {
    console.log("Test extension disposed!");
  },

  commands: [
    {
      id: "test.command",
      name: "Test Command",
      execute: () => {
        console.log("Test command executed!");
      },
    },
    {
      id: "test.insertHello",
      name: "Insert Hello",
      execute: args => {
        const editor = args?.editor;
        if (editor) {
          editor.insertText("Hello from extension! ");
        }
      },
    },
  ],

  keybindings: {
    "Ctrl+Shift+T": "test.command",
    "Ctrl+Shift+H": "test.insertHello",
  },

  decorations: () => {
    // Return dynamic decorations based on current state
    return [
      {
        range: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 10, offset: 10 },
        },
        type: "line",
        className: "test-line-highlight",
      },
    ];
  },

  onContentChange: (content, _changes) => {
    console.log("Content changed:", content.length, "characters");
  },

  onSelectionChange: selection => {
    if (selection) {
      console.log("Selection changed:", selection);
    } else {
      console.log("Selection cleared");
    }
  },

  onCursorChange: position => {
    console.log("Cursor moved to:", position);
  },
};
