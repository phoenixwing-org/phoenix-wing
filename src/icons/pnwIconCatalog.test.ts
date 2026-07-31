import { describe, expect, it } from "vitest";
import { PNW_ICON_NAMES, PNW_ICON_TEST_SIZES } from "./pnwIconCatalog.js";

describe("Pnw 常用图标目录", () => {
  it("首批名称唯一且覆盖壳层、面板与通用导航动作", () => {
    expect(new Set(PNW_ICON_NAMES).size).toBe(PNW_ICON_NAMES.length);
    expect(PNW_ICON_NAMES).toEqual(expect.arrayContaining([
      "settings",
      "more",
      "close",
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
      "folder",
      "document",
    ]));
  });

  it("视觉回归尺寸覆盖小图标、大 Ribbon 与品牌展示档", () => {
    expect(PNW_ICON_TEST_SIZES).toEqual([16, 24, 36, 48, 64]);
  });
});
