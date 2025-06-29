import { LSPConfig } from './types';

export const LSP_CONFIGS: Record<string, LSPConfig> = {
  ruby: {
    command: 'solargraph',
    args: ['stdio'],
    fileExtensions: ['.rb', '.ruby'],
    initializationOptions: {
      diagnostics: true,
      formatting: true,
      useBundler: false
    }
  },

  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    fileExtensions: ['.ts', '.tsx'],
    initializationOptions: {
      preferences: {
        includeCompletionsForModuleExports: true,
        includeCompletionsWithInsertText: true
      }
    }
  },

  javascript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    fileExtensions: ['.js', '.jsx'],
    initializationOptions: {
      preferences: {
        includeCompletionsForModuleExports: true,
        includeCompletionsWithInsertText: true
      }
    }
  },

  python: {
    command: 'pylsp',
    args: [],
    fileExtensions: ['.py'],
    initializationOptions: {
      settings: {
        pylsp: {
          plugins: {
            pycodestyle: { enabled: true },
            pyflakes: { enabled: true },
            autopep8: { enabled: true }
          }
        }
      }
    }
  }
};

export function getLanguageFromPath(filePath: string): string | null {
  const extension = '.' + filePath.split('.').pop()?.toLowerCase();
  
  for (const [language, config] of Object.entries(LSP_CONFIGS)) {
    if (config.fileExtensions.includes(extension)) {
      return language;
    }
  }
  
  return null;
}

export function isLanguageSupported(filePath: string): boolean {
  return getLanguageFromPath(filePath) !== null;
} 