import type { PlatformLayoutState, PlatformViewBounds } from "../shared/platformLayout";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LEFT_RAIL_WIDTH = 208;
const RIGHT_HISTORY_WIDTH = 260;
const WORKSPACE_PADDING = 10;
const PROMPT_BAR_HEIGHT = 118;
const PLATFORM_GAP = 10;
const TITLEBAR_HEIGHT = 42;

function sanitizeBounds(bounds: PlatformViewBounds): Bounds {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height))
  };
}

export function workspaceBounds(windowSize: { width: number; height: number }): Bounds {
  const x = LEFT_RAIL_WIDTH + WORKSPACE_PADDING;
  const y = WORKSPACE_PADDING;
  const rightInset = RIGHT_HISTORY_WIDTH + WORKSPACE_PADDING;
  const bottomInset = PROMPT_BAR_HEIGHT + WORKSPACE_PADDING;

  return {
    x,
    y,
    width: Math.max(320, windowSize.width - x - rightInset),
    height: Math.max(240, windowSize.height - y - bottomInset)
  };
}

export function boundsForLayout(
  windowSize: { width: number; height: number },
  layout: PlatformLayoutState
): Map<string, Bounds> {
  if (layout.hidePlatformViews) {
    return new Map();
  }

  const visiblePlatformIds = layout.focusedPlatformId
    ? layout.enabledPlatformIds.filter((id) => id === layout.focusedPlatformId)
    : layout.enabledPlatformIds;
  const reportedBounds = layout.visiblePlatformBounds;

  if (
    reportedBounds &&
    visiblePlatformIds.length > 0 &&
    visiblePlatformIds.every((platformId) => reportedBounds[platformId] !== undefined)
  ) {
    return new Map(
      visiblePlatformIds.map((platformId) => [platformId, sanitizeBounds(reportedBounds[platformId] as PlatformViewBounds)])
    );
  }

  const workspace = workspaceBounds(windowSize);
  const count = Math.max(1, visiblePlatformIds.length);
  const columns = layout.mode === "columns" ? count : count === 1 ? 1 : 2;
  const rows = layout.mode === "columns" ? 1 : count <= 2 ? 1 : 2;
  const cellWidth = Math.floor((workspace.width - PLATFORM_GAP * (columns - 1)) / columns);
  const cellHeight = Math.floor((workspace.height - PLATFORM_GAP * (rows - 1)) / rows);

  return new Map(
    visiblePlatformIds.map((platformId, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      return [
        platformId,
        {
          x: workspace.x + column * (cellWidth + PLATFORM_GAP),
          y: workspace.y + row * (cellHeight + PLATFORM_GAP) + TITLEBAR_HEIGHT,
          width: cellWidth,
          height: Math.max(1, cellHeight - TITLEBAR_HEIGHT)
        }
      ];
    })
  );
}
