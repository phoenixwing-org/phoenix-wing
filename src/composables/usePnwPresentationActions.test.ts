// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import { pnwProvidePresentationActions } from "./usePnwPresentationActions.js";
import PnwPageHeader from "../layout/PnwPageHeader.vue";

describe("per View presentation action ownership", () => {
  it("isolates Views and releases claims on unmount without business slots influencing ownership", async () => {
    const showFirst = ref(true);
    const label = ref("保存");
    const View = defineComponent({ setup() {
      pnwProvidePresentationActions({ mode: computed(() => "embedded"), detach() {}, reattach() {} });
      return () => h("section", [
        showFirst.value ? h(PnwPageHeader, { key: "first", title: "First" }, { right: () => h("button", label.value) }) : null,
        h(PnwPageHeader, { key: "second", title: "Second" }, { center: () => h("input") }),
      ]);
    } });
    const wrapper = mount(defineComponent({ setup: () => () => h("main", [h(View), h(View)]) }));
    expect(wrapper.findAll('[data-pnw-action-id="pnw.view.detach"]')).toHaveLength(2);
    label.value = "刷新";
    await nextTick();
    expect(wrapper.findAll('[data-pnw-action-id="pnw.view.detach"]')).toHaveLength(2);
    showFirst.value = false;
    await nextTick();
    expect(wrapper.findAll('[data-pnw-action-id="pnw.view.detach"]')).toHaveLength(2);
    showFirst.value = true;
    await nextTick();
    expect(wrapper.findAll('[data-pnw-action-id="pnw.view.detach"]')).toHaveLength(2);
    wrapper.unmount();
  });
});
