// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import PnwPageHeader from "./PnwPageHeader.vue";
import PnwPageLayout from "./PnwPageLayout.vue";

describe("View Header business slots", () => {
  it("updates conditional business slots without losing title or framework actions", async () => {
    const center = ref(true), right = ref(true);
    const host = defineComponent(() => () => h(PnwPageHeader, {
      title: "Stable title", presentationDetachable: true,
    }, {
      ...(center.value ? {center: () => h("input", {"aria-label": "Search"})} : {}),
      ...(right.value ? {right: () => h("button", "Save")} : {}),
    }));
    const wrapper = mount(host);
    for (const [showCenter, showRight] of [[true, true], [false, true], [false, false], [true, false], [true, true]]) {
      center.value = showCenter!;
      right.value = showRight!;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.pnw-head-middle').exists()).toBe(showCenter);
      expect(wrapper.find('.pnw-head-right').exists()).toBe(showRight);
      expect(wrapper.get('.pnw-page-title').text()).toBe('Stable title');
      expect(wrapper.get('.pnw-head-row').element.lastElementChild?.className).toBe('pnw-head-presentation-action');
    }
    wrapper.unmount();
  });
  it("keeps business actions independent and blocks framework actions during transitions", async () => {
    const wrapper = mount(PnwPageHeader, {
      props: {title: 'View', presentationDetachable: true, presentationMode: 'embedded'},
      slots: {right: '<button>Save</button>'},
    });
    await wrapper.get('.pnw-head-right button').trigger('click');
    expect(wrapper.emitted('detachView')).toBeUndefined();
    await wrapper.get('.pnw-head-presentation-action').trigger('click');
    expect(wrapper.emitted('detachView')).toHaveLength(1);
    for (const mode of ['opening', 'reattaching'] as const) {
      await wrapper.setProps({presentationMode: mode});
      expect(wrapper.get('.pnw-head-presentation-action').attributes('disabled')).toBeDefined();
      await wrapper.get('.pnw-head-presentation-action').trigger('click');
    }
    expect(wrapper.emitted('reattachView')).toBeUndefined();
    await wrapper.setProps({presentationMode: 'floating'});
    await wrapper.get('.pnw-head-presentation-action').trigger('click');
    expect(wrapper.emitted('reattachView')).toHaveLength(1);
    wrapper.unmount();
  });
  it("keeps framework action after both business slots", () => {
    const wrapper = mount(PnwPageHeader, {
      props: { title: "View", presentationDetachable: true },
      slots: { center: '<input aria-label="Search">', right: '<button>Save</button>' },
    });
    expect(wrapper.get('.pnw-head-middle input').attributes('aria-label')).toBe('Search');
    expect(wrapper.get('.pnw-head-right').text()).toBe('Save');
    expect(wrapper.get('.pnw-head-row').element.lastElementChild?.className).toBe('pnw-head-presentation-action');
    wrapper.unmount();
  });
  it("omits the middle container when only right is provided", () => {
    const wrapper = mount(PnwPageLayout, {props:{title:'View'},slots:{right:'<button>Save</button>'}});
    expect(wrapper.find('.pnw-head-middle').exists()).toBe(false);
    expect(wrapper.find('.pnw-head-row--no-middle').exists()).toBe(true);
    expect(wrapper.get('.pnw-head-right').text()).toBe('Save');
    wrapper.unmount();
  });
  it("retains legacy actions and help alongside new center", () => {
    const wrapper = mount(PnwPageHeader, {props:{title:'View',actionsAlign:'end'},slots:{center:'Search',actions:'Legacy',help:'Help'}});
    expect(wrapper.get('.pnw-head-middle--end').text()).toContain('Search');
    expect(wrapper.get('.pnw-head-actions').text()).toBe('Legacy');
    expect(wrapper.get('.pnw-head-help').text()).toBe('Help');
    wrapper.unmount();
  });
});
