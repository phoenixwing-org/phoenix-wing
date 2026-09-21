// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PnwWorkbenchPanelSettings from "./PnwWorkbenchPanelSettings.vue";

describe("workbench panel settings", () => {
  it("can restore footer and toggle bottom without a footer; unavailable blocks stay disabled", async () => {
    const wrapper = mount(PnwWorkbenchPanelSettings, { props: {
      showFooter: false,
      contributions: { primary: true, bottom: true, secondary: false },
      visibility: { primary: true, bottom: false, secondary: true },
    } });
    const inputs = wrapper.findAll("input");
    expect(inputs[0].element.checked).toBe(false);
    await inputs[0].setValue(true);
    expect(wrapper.emitted("update:showFooter")).toEqual([[true]]);
    await inputs[2].setValue(true);
    expect(wrapper.emitted("toggle")).toEqual([["bottom"]]);
    expect(inputs[3].element.disabled).toBe(true);
    expect(inputs[3].element.checked).toBe(false);
    wrapper.unmount();
  });
});
