// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PnwWorkspaceTypeSelect from "../components/PnwWorkspaceTypeSelect.vue";
import {
  pnwCreateDefaultWorkspaceTypes,
  pnwNormalizeWorkspaceTypeId,
  pnwNormalizeWorkspaceTypes,
} from "./pnwWorkspaceTypes.js";

describe("Pnw Workspace types", () => {
  it("提供稳定的默认类型与顺序", () => {
    expect(pnwCreateDefaultWorkspaceTypes("zh-CN")).toEqual([
      { typeId: "mixed", label: "混合", order: 10, builtin: true },
      { typeId: "code", label: "Code", order: 20, builtin: true },
      { typeId: "cad", label: "CAD", order: 30, builtin: true },
      { typeId: "lighting", label: "Lighting", order: 40, builtin: true },
    ]);
  });

  it("允许 Host 覆盖默认标签/顺序并追加自定义类型", () => {
    expect(pnwNormalizeWorkspaceTypes([
      { typeId: "simulation", label: "仿真", order: 15 },
      { typeId: "CAD", label: "机械 CAD", order: 5 },
      { typeId: " bad id ", label: "忽略" },
    ]).map(({ typeId, label, builtin }) => ({ typeId, label, builtin }))).toEqual([
      { typeId: "cad", label: "机械 CAD", builtin: true },
      { typeId: "mixed", label: "混合", builtin: true },
      { typeId: "simulation", label: "仿真", builtin: false },
      { typeId: "code", label: "Code", builtin: true },
      { typeId: "lighting", label: "Lighting", builtin: true },
    ]);
    expect(pnwNormalizeWorkspaceTypeId("  Simulation.Tools ")).toBe("simulation.tools");
    expect(pnwNormalizeWorkspaceTypeId("bad id")).toBeUndefined();
  });

  it("PnwWorkspaceTypeSelect 复用 PnwSelect 的受控 v-model 与 ARIA", async () => {
    const wrapper = mount(PnwWorkspaceTypeSelect, {
      props: {
        modelValue: "mixed",
        types: [{ typeId: "simulation", label: "仿真", order: 15 }],
      },
    });
    const trigger = wrapper.get(".pnw-select-trigger");
    expect(trigger.attributes("aria-label")).toBe("工作空间类型");
    expect(trigger.text()).toContain("混合");
    await trigger.trigger("click");
    const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options.map((option) => option.querySelector(".pnw-select-option-label")?.textContent)).toEqual([
      "混合",
      "仿真",
      "Code",
      "CAD",
      "Lighting",
    ]);
    options[1]?.click();
    expect(wrapper.emitted("update:modelValue")).toEqual([["simulation"]]);
    wrapper.unmount();
  });
});
