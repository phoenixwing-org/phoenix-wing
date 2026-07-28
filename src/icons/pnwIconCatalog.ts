export const PNW_ICON_NAMES = [
  "settings",
  "more",
  "close",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevron-down",
  "panel-left",
  "panel-bottom",
  "panel-right",
  "navigation-tree",
  "compact-toolbar",
  "compact-toolbar-title",
  "ribbon",
  "home",
  "search",
  "add",
  "refresh",
  "folder",
  "document",
] as const;

export type PnwIconName = (typeof PNW_ICON_NAMES)[number];

export const PNW_ICON_TEST_SIZES = [16, 24, 36, 48, 64] as const;
export type PnwIconTestSize = (typeof PNW_ICON_TEST_SIZES)[number];
