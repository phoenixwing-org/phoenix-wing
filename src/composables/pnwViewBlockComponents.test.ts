import { computed, defineComponent, h, ref } from "vue";
import { describe, expect, it } from "vitest";
import type {
  PnwBottomViewBlockComponentContribution,
  PnwViewBlockComponentContributions,
} from "../types/PnwWorkbenchVue.js";
import {
  pnwResolveBottomViewBlockComponent,
  pnwResolveBottomViewBlockTabs,
  pnwViewBlockComponentAvailability,
} from "./pnwViewBlockComponents.js";

const PnwTestBottom = defineComponent({
  setup: () => () => h("div", "Bottom"),
});

describe("Pnw View Block 组件分层", () => {
  it("应用默认 Bottom 让空 View 与普通 View 保持架构级可用性", () => {
    const defaultBottom: PnwBottomViewBlockComponentContribution = {
      component: PnwTestBottom,
      tabs: [{ id: "messages", label: "工作台消息" }],
    };
    const emptyView: PnwViewBlockComponentContributions = {};
    const ordinaryView: PnwViewBlockComponentContributions = {
      primary: { component: PnwTestBottom },
    };

    expect(pnwViewBlockComponentAvailability(emptyView, defaultBottom)).toEqual({
      primary: false,
      bottom: true,
      secondary: false,
    });
    expect(pnwViewBlockComponentAvailability(ordinaryView, defaultBottom)).toEqual({
      primary: true,
      bottom: true,
      secondary: false,
    });
    expect(pnwResolveBottomViewBlockComponent(undefined, defaultBottom)).toBe(defaultBottom);
  });

  it("当前 View Bottom 覆盖默认内容，并按 View、默认、旧 tabs 顺序回退", () => {
    const defaultTabs = ref([{ id: "messages", label: "工作台消息" }] as const);
    const viewTabs = ref([{ id: "repair", label: "数据库修正结果" }] as const);
    const defaultBottom: PnwBottomViewBlockComponentContribution = {
      component: PnwTestBottom,
      tabs: computed(() => defaultTabs.value),
    };
    const dedicatedBottom: PnwBottomViewBlockComponentContribution = {
      component: PnwTestBottom,
      tabs: computed(() => viewTabs.value),
    };
    const contentOnlyBottom: PnwBottomViewBlockComponentContribution = {
      component: PnwTestBottom,
    };
    const legacyTabs = [{ id: "legacy", label: "旧页签" }] as const;

    expect(pnwResolveBottomViewBlockComponent(dedicatedBottom, defaultBottom))
      .toBe(dedicatedBottom);
    expect(pnwResolveBottomViewBlockTabs(dedicatedBottom, defaultBottom, legacyTabs))
      .toBe(viewTabs.value);
    expect(pnwResolveBottomViewBlockTabs(contentOnlyBottom, defaultBottom, legacyTabs))
      .toBe(defaultTabs.value);
    expect(pnwResolveBottomViewBlockTabs(undefined, undefined, legacyTabs))
      .toBe(legacyTabs);
  });

  it("没有默认层时保留 0.6.0 的 View Bottom 可用性", () => {
    const viewBlocks: PnwViewBlockComponentContributions = {
      bottom: { component: PnwTestBottom },
    };

    expect(pnwViewBlockComponentAvailability(viewBlocks)).toEqual({
      primary: false,
      bottom: true,
      secondary: false,
    });
  });
});
