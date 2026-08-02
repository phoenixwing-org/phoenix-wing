import { describe, expect, it } from "vitest";
import {
  PNW_DEFAULT_LOCALE,
  pnwNormalizeLocale,
  pnwTranslateLocaleMessage,
} from "./pnwLocale.js";

describe("Pnw locale", () => {
  it("只接受 Host 可驱动的 zh-CN/en-US 并对未知值归一化", () => {
    expect(PNW_DEFAULT_LOCALE).toBe("zh-CN");
    expect(pnwNormalizeLocale("en-US")).toBe("en-US");
    expect(pnwNormalizeLocale("fr-FR")).toBe("zh-CN");
  });

  it("翻译工作台文案并替换命名参数", () => {
    expect(pnwTranslateLocaleMessage("en-US", "workbench.settings.narrowDetail", {
      presentation: "Side navigation tree",
    })).toContain("Side navigation tree");
    expect(pnwTranslateLocaleMessage("zh-CN", "workbench.tab.restore"))
      .toBe("还原工作台布局");
  });
});
