export function EditorStyles() {
  return (
    <style>
      {`
        .code-editor-content {
          font-family: inherit;
          background: transparent;
          border: none;
          outline: none;
          color: transparent;
          caret-color: var(--color-text);
        }
        .code-editor-content.vim-normal-mode {
          caret-color: transparent;
        }
        .code-editor-content.vim-insert-mode {
          caret-color: var(--color-text);
        }
        .code-editor-content:focus {
          outline: none;
        }
        .code-editor-content:not(.vim-visual-selection)::selection {
          background-color: var(--selection-bg, rgba(0, 123, 255, 0.3));
        }
        .code-editor-content:not(.vim-visual-selection)::-moz-selection {
          background-color: var(--selection-bg, rgba(0, 123, 255, 0.3));
        }
        .code-editor-content {
          white-space: pre;
          overflow-wrap: normal;
          word-break: normal;
        }
        /* Disable default div selection, keep span selection */
        div.code-editor-content::selection {
          background: transparent !important;
        }
        div.code-editor-content::-moz-selection {
          background: transparent !important;
        }
        /* Ensure spans show proper selection */
        .code-editor-content:not(.vim-visual-selection) span::selection {
          background-color: var(--selection-bg, rgba(0, 123, 255, 0.3)) !important;
        }
        .code-editor-content:not(.vim-visual-selection) span::-moz-selection {
          background-color: var(--selection-bg, rgba(0, 123, 255, 0.3)) !important;
        }
        .code-editor-content:empty:before {
          content: attr(data-placeholder);
          color: var(--color-text-lighter);
          pointer-events: none;
        }
        .vim-cursor-blink {
          animation: vim-cursor-blink 1s infinite;
        }
        @keyframes vim-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Hide scrollbars on line numbers */
        .line-numbers-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .line-numbers-container::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure line numbers use tabular figures for consistent width */
        .line-numbers-container {
          font-variant-numeric: tabular-nums;
          -webkit-font-feature-settings: "tnum";
          font-feature-settings: "tnum";
        }
        
        /* Disable selection on breadcrumbs */
        .breadcrumb,
        .breadcrumb-container,
        .breadcrumb-item,
        .breadcrumb-separator {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
      `}
    </style>
  );
}
