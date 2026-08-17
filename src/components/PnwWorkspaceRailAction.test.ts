// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PnwWorkspaceRailAction from "./PnwWorkspaceRailAction.vue";

describe("PnwWorkspaceRailAction", () => {
  it("提供中性全宽动作、18px currentColor 图标与稳定 ARIA", async () => {
    const wrapper = mount(PnwWorkspaceRailAction, {
      props: { label: "界面巡游", icon: "search" },
    });

    const button = wrapper.get("button");
    expect(button.classes()).toContain("pnw-workspace-entry-action");
    expect(button.attributes("aria-label")).toBe("界面巡游");
    expect(button.attributes("title")).toBe("界面巡游");
    expect(wrapper.get("svg").attributes("width")).toBe("18");
    expect(wrapper.get("svg").attributes("stroke")).toBe("currentColor");

    await button.trigger("click");
    expect(wrapper.emitted("activate")).toHaveLength(1);
  });

  it("支持禁用、文案 slot 和自定义图标 slot", async () => {
    const wrapper = mount(PnwWorkspaceRailAction, {
      props: { label: "Secondary", disabled: true },
      slots: {
        default: "次级动作",
        icon: "◆",
      },
    });

    expect(wrapper.get("button").attributes()).toHaveProperty("disabled");
    expect(wrapper.text()).toContain("◆");
    expect(wrapper.text()).toContain("次级动作");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("activate")).toBeUndefined();
  });
});
