// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PnwSidebarBlock from "./PnwSidebarBlock.vue";

describe("PnwSidebarBlock variants", () => {
  it("keeps strip as the compatible default and lets Main opt into card", async () => {
    const wrapper = mount(PnwSidebarBlock, { props: { title: 'Block' }, slots: { default: '<input value="draft">' } });
    expect(wrapper.classes()).toContain('pnw-sidebar-block--strip');
    const input = wrapper.get('input').element;
    await wrapper.setProps({ variant: 'card' });
    expect(wrapper.classes()).toContain('pnw-sidebar-block--card');
    expect(wrapper.get('input').element).toBe(input);
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
    expect(wrapper.emitted('update:expanded')).toEqual([[false]]);
    wrapper.unmount();
  });
  it("keeps header actions separate from collapse and supports no body inset", async () => {
    const wrapper = mount(PnwSidebarBlock, {
      props: { title: 'Main', variant: 'card', bodyInset: false },
      slots: { actions: '<button>Refresh</button>', suffix: 'Ready', default: 'Content' },
    });
    await wrapper.get('.pnw-sidebar-block-actions button').trigger('click');
    expect(wrapper.emitted('toggle')).toBeUndefined();
    expect(wrapper.classes()).toContain('pnw-sidebar-block--body-inset-none');
    await wrapper.setProps({ collapsible: false, expanded: false });
    expect(wrapper.find('button.pnw-sidebar-block-head-toggle').exists()).toBe(false);
    expect(wrapper.get('.pnw-sidebar-block-body').attributes('style') ?? '').not.toContain('display: none');
    wrapper.unmount();
  });
  it("defines a token-based solid rounded card and no header action divider", () => {
    const source = readFileSync(resolve(process.cwd(), 'src/layout/PnwSidebarBlock.vue'), 'utf8');
    const head = readFileSync(resolve(process.cwd(), 'src/layout/PnwSidebarBlockHead.vue'), 'utf8');
    const card = source.match(/\.pnw-sidebar-block--card\s*\{([^}]+)\}/u)?.[1];
    expect(card).toContain('border: 1px solid');
    expect(card).toContain('border-radius: var(--pnw-sidebar-block-radius, 8px)');
    expect(card).toContain('--pnw-workbench-default-surface');
    expect(head).not.toContain('border-left:');
    expect(head).toContain(':focus-visible');
    const stripHead = source.match(/\.pnw-sidebar-block--strip > \.pnw-sidebar-block-head-wrap\s*\{([^}]+)\}/u)?.[1];
    expect(stripHead).toContain('border-block: 1px solid');
    expect(stripHead).toContain('var(--panel-head-bg, transparent)');
    expect(source).not.toMatch(/\.pnw-sidebar-block[^\n>{]*\s\.pnw-sidebar-block-(?:head-wrap|body)\s*\{/u);
  });
});
