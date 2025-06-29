import { useEffect } from 'react';
import { isTauri } from '../utils/platform';
import { Buffer } from '../types/buffer';
import { CoreFeaturesState } from '../types/core-features';

interface UseKeyboardShortcutsProps {
  setIsBottomPaneVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setBottomPaneActiveTab: (tab: 'terminal' | 'diagnostics') => void;
  setIsFindVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsSidebarVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsRightPaneVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsCommandBarVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsCommandPaletteVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsSearchViewActive: (value: boolean) => void;
  focusSearchInput: () => void;
  focusCommandPalette: () => void;
  activeBuffer: Buffer | null;
  closeBuffer: (bufferId: string) => void;
  switchToNextBuffer: () => void;
  switchToPreviousBuffer: () => void;
  buffers: Buffer[];
  setActiveBuffer: (bufferId: string) => void;
  isBottomPaneVisible: boolean;
  bottomPaneActiveTab: 'terminal' | 'diagnostics';
  onSave?: () => void;
  onQuickEdit?: () => void;
  coreFeatures: CoreFeaturesState;
}

export const useKeyboardShortcuts = ({
  setIsBottomPaneVisible,
  setBottomPaneActiveTab,
  setIsFindVisible,
  setIsSidebarVisible,
  setIsRightPaneVisible,
  setIsCommandBarVisible,
  setIsCommandPaletteVisible,
  setIsSearchViewActive,
  focusSearchInput,
  focusCommandPalette,
  activeBuffer,
  closeBuffer,
  switchToNextBuffer,
  switchToPreviousBuffer,
  buffers,
  setActiveBuffer,
  isBottomPaneVisible,
  bottomPaneActiveTab,
  onSave,
  onQuickEdit,
  coreFeatures,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // Cmd+J (Mac) or Ctrl+J (Windows/Linux) to toggle terminal (desktop only)
      if ((e.metaKey || e.ctrlKey) && e.key === 'j' && isTauri() && coreFeatures.terminal) {
        e.preventDefault();
        if (isBottomPaneVisible && bottomPaneActiveTab === 'terminal') {
          setIsBottomPaneVisible(false);
        } else {
          setBottomPaneActiveTab('terminal');
          setIsBottomPaneVisible(true);
        }
        return;
      }

      // Cmd+Shift+J (Mac) or Ctrl+Shift+J (Windows/Linux) to toggle diagnostics
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'J' && isTauri() && coreFeatures.diagnostics) {
        e.preventDefault();
        if (isBottomPaneVisible && bottomPaneActiveTab === 'diagnostics') {
          setIsBottomPaneVisible(false);
        } else {
          setBottomPaneActiveTab('diagnostics');
          setIsBottomPaneVisible(true);
        }
        return;
      }

      // Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        if (onSave) {
          onSave();
        }
        return;
      }

      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open AI quick edit
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K') && !e.shiftKey && coreFeatures.aiChat) {
        e.preventDefault();
        e.stopPropagation();
        if (onQuickEdit) {
          onQuickEdit();
        }
        return;
      }

      // Cmd+F (Mac) or Ctrl+F (Windows/Linux) to toggle find
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        setIsFindVisible(prev => !prev);
        return;
      }

      // Cmd+Shift+F (Mac) or Ctrl+Shift+F (Windows/Linux) to open project search
      // Check for Mac using multiple methods
      const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform) || 
                   /Mac/.test(navigator.userAgent) ||
                   navigator.platform === 'MacIntel';
      
      const correctModifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (correctModifier && e.shiftKey && e.key === 'F' && coreFeatures.search) {
        e.preventDefault();
        e.stopPropagation();
        setIsSidebarVisible(true);
        setIsSearchViewActive(true);
        // Focus the search input after a short delay to ensure the view is rendered
        setTimeout(() => {
          focusSearchInput();
        }, 100);
        return;
      }
      
      // Also handle if Mac users are somehow sending ctrlKey instead of metaKey
      if (isMac && e.ctrlKey && e.shiftKey && e.key === 'F' && coreFeatures.search) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Mac detected but using ctrlKey - this is unusual');
        setIsSidebarVisible(true);
        setIsSearchViewActive(true);
        setTimeout(() => {
          focusSearchInput();
        }, 100);
        return;
      }

      // Alternative shortcut: Cmd+Shift+H (Mac) or Ctrl+Shift+H (Windows/Linux) to open project search
      // This is a backup in case Cmd+Shift+F is captured by the browser/system
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H' && coreFeatures.search) {
        e.preventDefault();
        e.stopPropagation();
        setIsSidebarVisible(true);
        setIsSearchViewActive(true);
        setTimeout(() => {
          focusSearchInput();
        }, 100);
        return;
      }

      // Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarVisible(prev => !prev);
        return;
      }

      // Cmd+R (Mac) or Ctrl+R (Windows/Linux) to toggle right pane
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && coreFeatures.aiChat) {
        e.preventDefault();
        setIsRightPaneVisible(prev => !prev);
        return;
      }

      // Cmd+P (Mac) or Ctrl+P (Windows/Linux) to toggle command bar
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setIsCommandBarVisible(prev => !prev);
        return;
      }

      // Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux) to toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsCommandPaletteVisible(prev => !prev);
        // Focus the command palette after a short delay to ensure it's rendered
        setTimeout(() => {
          focusCommandPalette();
        }, 100);
        return;
      }

      // Cmd+W (Mac) or Ctrl+W (Windows/Linux) to close current buffer
      if ((e.metaKey || e.ctrlKey) && e.key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeBuffer) {
          closeBuffer(activeBuffer.id);
        }
        return;
      }

      // Cmd+Tab (Mac) or Ctrl+Tab (Windows/Linux) to switch to next buffer
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        switchToNextBuffer();
        return;
      }

      // Cmd+Shift+Tab (Mac) or Ctrl+Shift+Tab (Windows/Linux) to switch to previous buffer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        switchToPreviousBuffer();
        return;
      }

      // Number keys to switch to specific buffers (Cmd+1, Cmd+2, etc.)
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const bufferIndex = parseInt(e.key) - 1;
        if (buffers[bufferIndex]) {
          setActiveBuffer(buffers[bufferIndex].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    setIsBottomPaneVisible,
    setBottomPaneActiveTab,
    setIsFindVisible,
    setIsSidebarVisible,
    setIsRightPaneVisible,
    setIsCommandBarVisible,
    setIsCommandPaletteVisible,
    setIsSearchViewActive,
    focusSearchInput,
    focusCommandPalette,
    activeBuffer,
    closeBuffer,
    switchToNextBuffer,
    switchToPreviousBuffer,
    buffers,
    setActiveBuffer,
    isBottomPaneVisible,
    bottomPaneActiveTab,
    onSave,
    onQuickEdit,
  ]);
}; 