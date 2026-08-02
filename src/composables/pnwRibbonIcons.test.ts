import { defineComponent } from "vue";
import { describe, expect, it } from "vitest";
import {
  pnwRegisterRibbonIcons,
  pnwRibbonIconFor,
} from "./pnwRibbonIcons.js";

describe("旧 Ribbon pageId 图标注册入口", () => {
  it("继续接受 Vue Component 映射并保留 fallback 语义", () => {
    const PnwLegacyPageIcon = defineComponent({ name: "PnwLegacyPageIcon" });
    const PnwLegacyFallbackIcon = defineComponent({ name: "PnwLegacyFallbackIcon" });

    pnwRegisterRibbonIcons({ dashboard: PnwLegacyPageIcon });
    try {
      expect(pnwRibbonIconFor("dashboard")).toBe(PnwLegacyPageIcon);
      expect(pnwRibbonIconFor("missing", PnwLegacyFallbackIcon)).toBe(PnwLegacyFallbackIcon);
      expect(pnwRibbonIconFor("missing")).toBeUndefined();
    } finally {
      pnwRegisterRibbonIcons({});
    }
  });
});
