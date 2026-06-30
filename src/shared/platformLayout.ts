export type PlatformLayoutMode = "grid" | "columns";

export interface PlatformViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformLayoutState {
  enabledPlatformIds: string[];
  focusedPlatformId: string | null;
  mode: PlatformLayoutMode;
  visiblePlatformBounds?: Partial<Record<string, PlatformViewBounds>>;
  hidePlatformViews?: boolean;
}
