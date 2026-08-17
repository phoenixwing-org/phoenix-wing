export const PNW_ICON_NAMES = [
  "settings",
  "more",
  "close",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevron-down",
  "panel-left",
  "panel-left-active",
  "panel-bottom",
  "panel-bottom-active",
  "panel-right",
  "panel-right-active",
  "navigation-tree",
  "compact-toolbar",
  "compact-toolbar-title",
  "ribbon",
  "home",
  "search",
  "add",
  "refresh",
  "close-others",
  "editor-maximize",
  "editor-restore",
  "window-float",
  "window-reattach",
  "sun",
  "moon",
  "unknown",
  "dashboard",
  "list",
  "history",
  "report",
  "folder",
  "document",
] as const;

export type PnwIconName = (typeof PNW_ICON_NAMES)[number];

const PNW_ICON_NAME_SET: ReadonlySet<string> = new Set(PNW_ICON_NAMES);

export function pnwIsIconName(value: unknown): value is PnwIconName {
  return typeof value === "string" && PNW_ICON_NAME_SET.has(value);
}

export const PNW_ICON_TEST_SIZES = [16, 24, 36, 48, 64] as const;
export type PnwIconTestSize = (typeof PNW_ICON_TEST_SIZES)[number];
