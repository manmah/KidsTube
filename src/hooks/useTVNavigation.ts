import { useEffect, useCallback } from 'react';

interface TVNavigationOptions {
  enabled: boolean;
  categoryCount: number;
  getVideoCountForRow: (row: number) => number;
  selectedRow: number;
  selectedCol: number;
  onNavigate: (row: number, col: number) => void;
  onSelect: (row: number, col: number) => void;
  onBack: () => void;
  onTogglePlay?: () => void;
  onToggleFullscreen?: () => void;
  isPlayingVideo: boolean;
  onNextVideo?: () => void;
  onPrevVideo?: () => void;
}

export function useTVNavigation({
  enabled,
  categoryCount,
  getVideoCountForRow,
  selectedRow,
  selectedCol,
  onNavigate,
  onSelect,
  onBack,
  onTogglePlay,
  onToggleFullscreen,
  isPlayingVideo,
  onNextVideo,
  onPrevVideo,
}: TVNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          target.blur();
          e.preventDefault();
        }
        return;
      }

      // If playing video full screen / player view
      if (isPlayingVideo) {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
          e.preventDefault();
          onBack();
          return;
        }
        if (e.key === ' ' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          onTogglePlay?.();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'MediaTrackNext' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          onNextVideo?.();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'MediaTrackPrevious' || e.key.toLowerCase() === 'b') {
          e.preventDefault();
          onPrevVideo?.();
          return;
        }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          onToggleFullscreen?.();
          return;
        }
        return;
      }

      if (!enabled || categoryCount === 0) return;

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          if (selectedRow > 0) {
            const newRow = selectedRow - 1;
            const maxCol = Math.max(0, getVideoCountForRow(newRow) - 1);
            onNavigate(newRow, Math.min(selectedCol, maxCol));
          }
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          if (selectedRow < categoryCount - 1) {
            const newRow = selectedRow + 1;
            const maxCol = Math.max(0, getVideoCountForRow(newRow) - 1);
            onNavigate(newRow, Math.min(selectedCol, maxCol));
          }
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          if (selectedCol > 0) {
            onNavigate(selectedRow, selectedCol - 1);
          }
          break;
        }

        case 'ArrowRight': {
          e.preventDefault();
          const maxCol = getVideoCountForRow(selectedRow) - 1;
          if (selectedCol < maxCol) {
            onNavigate(selectedRow, selectedCol + 1);
          }
          break;
        }

        case 'Enter':
        case 'NumpadEnter': {
          e.preventDefault();
          onSelect(selectedRow, selectedCol);
          break;
        }

        case 'Escape':
        case 'Backspace':
        case 'BrowserBack': {
          e.preventDefault();
          onBack();
          break;
        }

        case 'f':
        case 'F': {
          e.preventDefault();
          onToggleFullscreen?.();
          break;
        }

        // Numeric keys 1-9 to jump to category index
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          const catIndex = parseInt(e.key, 10) - 1;
          if (catIndex < categoryCount) {
            e.preventDefault();
            onNavigate(catIndex, 0);
          }
          break;
        }
      }
    },
    [
      enabled,
      categoryCount,
      getVideoCountForRow,
      selectedRow,
      selectedCol,
      onNavigate,
      onSelect,
      onBack,
      onTogglePlay,
      onToggleFullscreen,
      isPlayingVideo,
      onNextVideo,
      onPrevVideo,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
