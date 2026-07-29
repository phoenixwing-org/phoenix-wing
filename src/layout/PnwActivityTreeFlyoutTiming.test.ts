import { describe, expect, it } from "vitest";
import {
  PNW_ACTIVITY_TREE_FLYOUT_CLOSE_DELAY_MS,
  PNW_ACTIVITY_TREE_FLYOUT_INITIAL_OPEN_DELAY_MS,
  PNW_ACTIVITY_TREE_FLYOUT_SWITCH_DELAY_MS,
  pnwCanHoverActivityTreeFlyout,
  pnwResolveActivityTreeFlyoutOpenDelay,
} from "./PnwActivityTreeFlyoutTiming.js";

describe("PnwActivityTree root-flyout 内部交互时序", () => {
  it("首次悬停延时打开，已打开时更快切换一级分组", () => {
    expect(pnwResolveActivityTreeFlyoutOpenDelay("", "workspace"))
      .toBe(PNW_ACTIVITY_TREE_FLYOUT_INITIAL_OPEN_DELAY_MS);
    expect(pnwResolveActivityTreeFlyoutOpenDelay("workspace", "system"))
      .toBe(PNW_ACTIVITY_TREE_FLYOUT_SWITCH_DELAY_MS);
    expect(pnwResolveActivityTreeFlyoutOpenDelay("workspace", "workspace")).toBeNull();
    expect(PNW_ACTIVITY_TREE_FLYOUT_CLOSE_DELAY_MS).toBe(280);
  });

  it("触摸不依赖 hover，鼠标和支持悬停的笔仍可快速浏览", () => {
    expect(pnwCanHoverActivityTreeFlyout("mouse")).toBe(true);
    expect(pnwCanHoverActivityTreeFlyout("pen")).toBe(true);
    expect(pnwCanHoverActivityTreeFlyout("touch")).toBe(false);
    expect(pnwCanHoverActivityTreeFlyout("")).toBe(false);
  });
});
