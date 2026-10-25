// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { PnwContentBlock } from "@phoenix-wing/code-core/ui";
import PwwContentBlockValidation from "./PwwContentBlockValidation.vue";

const pwwWrappers: ReturnType<typeof mount>[] = [];
afterEach(() => pwwWrappers.splice(0).forEach(wrapper => wrapper.unmount()));

describe("discoverable public ContentBlock validation page", () => {
  it("demonstrates all six slots, separate secondary Blocks and a non-interactive static heading", () => {
    const wrapper = mount(PwwContentBlockValidation, { attachTo: document.body }); pwwWrappers.push(wrapper);
    const blocks = wrapper.findAll("pnw-content-block").map(block => block.element as PnwContentBlock);
    expect(blocks).toHaveLength(3);
    const primary = blocks.find(block => block.dataset.pwwContentBlock === "primary")!;
    expect(Array.from(primary.children).map(node => node.getAttribute("slot"))).toEqual(["title", "icon", "status", "context", "actions", "body"]);
    expect(blocks.find(block => block.dataset.pwwContentBlock === "secondary")!.level).toBe("secondary");
    const fixed = blocks.find(block => block.dataset.pwwContentBlock === "static")!;
    expect(fixed.collapsible).toBe(false); expect(fixed.shadowRoot!.querySelector('[part="toggle"]')!.tagName).toBe("DIV");
    expect(fixed.shadowRoot!.querySelector("button")).toBeNull();
  });

  it("keeps drafts and selections through refresh, collapse, narrow width and presentation reset", async () => {
    const wrapper = mount(PwwContentBlockValidation, { attachTo: document.body }); pwwWrappers.push(wrapper);
    const input = wrapper.get<HTMLInputElement>('[aria-label="内容 Block 草稿"]'); await input.setValue("keep draft");
    const check = wrapper.get<HTMLInputElement>('[aria-label="保留选择"]'); await check.setValue(false);
    const primary = wrapper.get('[data-pww-content-block="primary"]').element as PnwContentBlock;
    await wrapper.get('[aria-label="刷新内容 Block"]').trigger("click"); expect(primary.open).toBe(true);
    expect(primary.querySelector('[slot="status"]')!.textContent).toBe("刷新 1 次");
    primary.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.click(); expect(primary.open).toBe(false);
    const options = wrapper.findAll('.pww-content-block-options input'); await options[0].setValue(true); await options[1].setValue(false);
    expect(wrapper.get('.pww-content-block-stage').classes()).toContain('pww-content-block-stage--narrow');
    expect(primary.collapsible).toBe(false); expect(primary.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!.hidden).toBe(false);
    await wrapper.get('.pww-content-block-options button').trigger('click'); await nextTick();
    expect(primary.open).toBe(true); expect(primary.collapsible).toBe(true);
    expect(wrapper.get('[aria-label="内容 Block 草稿"]').element).toBe(input.element); expect(input.element.value).toBe("keep draft");
    expect(wrapper.get('[aria-label="保留选择"]').element).toBe(check.element); expect(check.element.checked).toBe(false);
    expect(wrapper.text()).toContain("原输入、下拉选择和复选框节点保持不变");
  });
});
