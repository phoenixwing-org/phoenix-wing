// @vitest-environment happy-dom
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { PnwFloatingPanel, PnwPageLayout, PnwWorkbenchLayout } from "phoenix-wing";
import PwwVerificationBanner from "./PwwVerificationBanner.vue";
import PwwTabArrangementValidation from "./PwwTabArrangementValidation.vue";

const pwwWrappers: ReturnType<typeof mount>[] = [];
afterEach(() => { pwwWrappers.splice(0).forEach(wrapper => wrapper.unmount()); });

describe("simple validation UI", () => {
  it("distinguishes development evidence from Registry and warns on stale build version", () => {
    const wrapper = mount(PwwVerificationBanner, { props: {
      source: { mode: "development", version: "0.7.5", checkedAt: "2026-09-14", commit: "a".repeat(40), branch: "sample", dirty: true }, runtimeVersion: "0.7.4",
    } }); pwwWrappers.push(wrapper);
    expect(wrapper.text()).toContain("开发验证");
    expect(wrapper.text()).toContain("含未提交修改");
    expect(wrapper.text()).toContain("不代表 Registry 验收");
    expect(wrapper.get('[role="alert"]').text()).toContain("版本不匹配");
  });
  it("Registry label doesn't claim overall tests passed or invent commit evidence", () => {
    const wrapper = mount(PwwVerificationBanner, { props: {
      source: { mode: "registry", version: "0.7.5", checkedAt: "2026-09-14" }, runtimeVersion: "0.7.5",
    } }); pwwWrappers.push(wrapper);
    expect(wrapper.text()).toContain("Registry 验证");
    expect(wrapper.text()).toContain("不代表全部测试通过");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("工作树");
  });
  it("runs four real public-API assertions and preserves edits across repeated checks", async () => {
    const wrapper = mount(PwwTabArrangementValidation, { attachTo: document.body }); pwwWrappers.push(wrapper);
    await flushPromises(); await nextTick();
    expect(wrapper.findAll('[data-passed="true"]')).toHaveLength(4);
    expect(wrapper.findAll('[data-passed="false"]')).toHaveLength(0);
    const input = wrapper.get<HTMLInputElement>('[data-draft="first"]');
    await input.setValue("changed draft");
    const frame = wrapper.get('[data-frame="first"]').element;
    await wrapper.get('button[aria-label="运行检查"]').trigger("click");
    await flushPromises(); await nextTick();
    expect(wrapper.get('[data-draft="first"]').element).toBe(input.element);
    expect(input.element.value).toBe("changed draft");
    expect(wrapper.get('[data-frame="first"]').element).toBe(frame);
  });
  it("uses Wing Primary/View navigation with a Header and working text actions inside each tab", async () => {
    const wrapper = mount(PwwTabArrangementValidation, { attachTo: document.body }); pwwWrappers.push(wrapper);
    await flushPromises();
    expect(wrapper.findComponent(PnwWorkbenchLayout).exists()).toBe(true);
    expect(wrapper.findAllComponents(PnwPageLayout).length).toBeGreaterThan(1);
    const input = wrapper.get<HTMLInputElement>('[data-draft="first"]');
    await input.setValue("keep across tests");
    await wrapper.findAll('button[aria-label="读取草稿"]')[0].trigger("click");
    expect(wrapper.text()).toContain("当前草稿：keep across tests");
    await wrapper.get('[role="treeitem"][title="简单断言"]').trigger("click");
    expect(wrapper.get('h1').text()).toBe("简单断言");
    await wrapper.get('[role="treeitem"][title="Tab 内容保活"]').trigger("click");
    expect(wrapper.get('[data-draft="first"]').element).toBe(input.element);
    expect(input.element.value).toBe("keep across tests");
  });
  it("forwards the selected theme to all non-modal floating windows", async () => {
    const wrapper = mount(PwwTabArrangementValidation, { attachTo: document.body, props: { colorScheme: "dark" } }); pwwWrappers.push(wrapper);
    await flushPromises();
    await wrapper.get('[role="treeitem"][title="浮窗平铺与层叠"]').trigger("click");
    await wrapper.get('button[aria-label="平铺三窗"]').trigger("click");
    expect(wrapper.findAllComponents(PnwFloatingPanel)).toHaveLength(3);
    for (const label of ["平铺三窗", "层叠三窗", "关闭浮窗"]) {
      const button = wrapper.get(`button[aria-label="${label}"]`);
      expect(button.get(".pnw-ribbon-tool-label").text()).toBe(label);
      expect(button.find("svg").exists()).toBe(true);
    }
    expect(wrapper.findAllComponents(PnwFloatingPanel).every(panel => panel.props("colorScheme") === "dark")).toBe(true);
    await wrapper.setProps({ colorScheme: "light" });
    expect(wrapper.findAllComponents(PnwFloatingPanel).every(panel => panel.props("colorScheme") === "light")).toBe(true);
  });
});
