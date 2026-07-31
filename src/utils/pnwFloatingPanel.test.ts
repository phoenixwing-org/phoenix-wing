import { describe, expect, it } from "vitest";
import { pnwClampFloatingPanelPosition } from "./pnwFloatingPanel.js";

describe("pnwClampFloatingPanelPosition", () => {
  const panel = { width: 400, height: 300 };
  const viewport = { width: 1000, height: 700 };

  it("保留已经完整可见的位置", () => {
    expect(pnwClampFloatingPanelPosition({ x: 120, y: 90 }, panel, viewport))
      .toEqual({ x: 120, y: 90 });
  });

  it("修正四边越界并保留 margin", () => {
    expect(pnwClampFloatingPanelPosition({ x: -40, y: -20 }, panel, viewport, 12))
      .toEqual({ x: 12, y: 12 });
    expect(pnwClampFloatingPanelPosition({ x: 900, y: 600 }, panel, viewport, 12))
      .toEqual({ x: 588, y: 388 });
  });

  it("面板大于视口时保留左上标题栏且处理非有限值", () => {
    expect(pnwClampFloatingPanelPosition(
      { x: Number.NaN, y: Number.POSITIVE_INFINITY },
      { width: 900, height: 800 },
      { width: 640, height: 480 },
    )).toEqual({ x: 8, y: 8 });
  });
});
