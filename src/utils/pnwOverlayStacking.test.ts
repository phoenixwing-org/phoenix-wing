import { describe, expect, it } from "vitest";
import {
  PNW_WORKBENCH_OVERLAY_LAYERS,
  pnwResolveWorkbenchOverlayZIndex,
} from "./pnwOverlayStacking.js";

describe("Pnw 工作台叠层契约", () => {
  it("Host 工具高于 Wing 浮动设置且低于模态层", () => {
    expect(PNW_WORKBENCH_OVERLAY_LAYERS.hostTools)
      .toBeGreaterThan(PNW_WORKBENCH_OVERLAY_LAYERS.floatingPanel);
    expect(PNW_WORKBENCH_OVERLAY_LAYERS.modal)
      .toBeGreaterThan(PNW_WORKBENCH_OVERLAY_LAYERS.hostTools);
  });

  it("仅接受有限数值覆盖", () => {
    expect(pnwResolveWorkbenchOverlayZIndex("floatingPanel")).toBe(1200);
    expect(pnwResolveWorkbenchOverlayZIndex("floatingPanel", 3210)).toBe(3210);
    expect(pnwResolveWorkbenchOverlayZIndex("floatingPanel", Number.NaN)).toBe(1200);
  });
});
