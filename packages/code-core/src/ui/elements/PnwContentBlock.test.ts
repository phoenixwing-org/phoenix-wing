// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  PNW_CONTENT_BLOCK_TAG, PNW_CONTENT_BLOCK_TOGGLE, PnwContentBlock,
  pnwCreateContentBlockClass, pnwDefineContentBlock, type PnwContentBlockToggleDetail,
} from "./PnwContentBlock.js";

beforeAll(() => { pnwDefineContentBlock(); });
afterEach(() => document.body.replaceChildren());

function pnwSlot(pnwName: string, pnwText: string, pnwTag = "span"): HTMLElement {
  const pnwNode = document.createElement(pnwTag); pnwNode.slot = pnwName; pnwNode.textContent = pnwText; return pnwNode;
}
function pnwMount(): PnwContentBlock {
  const pnwBlock = document.createElement(PNW_CONTENT_BLOCK_TAG);
  pnwBlock.append(pnwSlot("title", "示例内容"), pnwSlot("body", "正文内容")); document.body.append(pnwBlock); return pnwBlock;
}
function pnwToggle(pnwBlock: PnwContentBlock): HTMLElement { return pnwBlock.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!; }
function pnwBody(pnwBlock: PnwContentBlock): HTMLElement { return pnwBlock.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!; }

describe("PnwContentBlock public presentation", () => {
  it("registers once and exposes the six slots, default body fallback and stable semantic parts", () => {
    expect(pnwDefineContentBlock()).toBe(PnwContentBlock); expect(pnwDefineContentBlock()).toBe(PnwContentBlock);
    const pnwBlock = pnwMount();
    expect(pnwBlock.open).toBe(true); expect(pnwBlock.hasAttribute("open")).toBe(true);
    expect(pnwBlock.level).toBe("primary"); expect(pnwBlock.collapsible).toBe(true);
    expect(pnwBody(pnwBlock).hidden).toBe(false); expect(pnwToggle(pnwBlock).tagName).toBe("BUTTON");
    expect(pnwToggle(pnwBlock).getAttribute("aria-expanded")).toBe("true");
    expect(Array.from(pnwBlock.shadowRoot!.querySelectorAll("slot[name]")).map(pnwNode => pnwNode.getAttribute("name"))).toEqual(["icon", "title", "status", "context", "actions", "body"]);
    for (const pnwPart of ["block", "header", "toggle", "chevron", "icon", "title", "status", "context", "actions", "body"]) expect(pnwBlock.shadowRoot!.querySelector(`[part="${pnwPart}"]`)).not.toBeNull();
    expect(pnwBlock.shadowRoot!.querySelector('slot[name="body"] > slot:not([name])')).not.toBeNull();
    expect(pnwBlock.shadowRoot!.querySelector("details,summary")).toBeNull();
    expect(pnwBlock.shadowRoot!.querySelector('[part="chevron"] path')!.getAttribute("d")).toBe("m9 5 7 7-7 7");
  });

  it("reflects properties and boolean attributes without emitting user events", () => {
    const pnwBlock = pnwMount(), pnwChanged = vi.fn(); pnwBlock.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwChanged);
    pnwBlock.open = false; expect(pnwBody(pnwBlock).hidden).toBe(true); expect(pnwBlock.hasAttribute("open")).toBe(false);
    pnwBlock.setAttribute("open", "false"); expect(pnwBlock.open).toBe(true); expect(pnwBody(pnwBlock).hidden).toBe(false);
    pnwBlock.removeAttribute("open"); expect(pnwBlock.open).toBe(false);
    pnwBlock.level = "secondary"; expect(pnwBlock.getAttribute("level")).toBe("secondary");
    pnwBlock.setAttribute("level", "invalid"); expect(pnwBlock.level).toBe("primary");
    expect(pnwChanged).not.toHaveBeenCalled();
  });

  it("provides Header focus without requiring the caller to access Shadow DOM or focusing static headings", () => {
    const pnwBlock = pnwMount(), pnwChanged = vi.fn(); pnwBlock.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwChanged);
    pnwBlock.open = false; pnwBlock.focusHeader({ preventScroll: true });
    expect(pnwBlock.shadowRoot!.activeElement).toBe(pnwToggle(pnwBlock)); expect(pnwBlock.open).toBe(false);
    pnwBlock.collapsible = false; pnwBlock.focusHeader();
    expect(pnwBlock.shadowRoot!.activeElement).not.toBe(pnwToggle(pnwBlock)); expect(pnwChanged).not.toHaveBeenCalled();
  });

  it("emits one immutable, bubbling, composed notification per native disclosure click", () => {
    const pnwBlock = pnwMount(), pnwSeen: PnwContentBlockToggleDetail[] = [];
    const pnwListener = vi.fn((pnwEvent: Event) => {
      expect(pnwEvent.bubbles).toBe(true); expect(pnwEvent.composed).toBe(true);
      expect(Object.isFrozen((pnwEvent as CustomEvent).detail)).toBe(true);
      pnwSeen.push((pnwEvent as CustomEvent<PnwContentBlockToggleDetail>).detail);
    });
    document.body.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwListener);
    try {
      pnwToggle(pnwBlock).click(); expect(pnwBlock.open).toBe(false); expect(pnwBody(pnwBlock).hidden).toBe(true);
      pnwToggle(pnwBlock).click(); expect(pnwBlock.open).toBe(true);
      expect(pnwSeen).toEqual([{ expanded: false }, { expanded: true }]); expect(pnwListener).toHaveBeenCalledTimes(2);
    } finally { document.body.removeEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwListener); }
  });

  it("keeps Header context/actions independent of disclosure and does not reserve empty slots", async () => {
    const pnwBlock = pnwMount(), pnwRoot = pnwBlock.shadowRoot!, pnwChanged = vi.fn();
    pnwBlock.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwChanged);
    for (const pnwName of ["icon", "status", "context", "actions"]) expect(pnwRoot.querySelector<HTMLElement>(`[part="${pnwName}"]`)!.hidden).toBe(true);
    const pnwContext = pnwSlot("context", "范围", "label"), pnwCheck = document.createElement("input"); pnwCheck.type = "checkbox"; pnwContext.prepend(pnwCheck);
    const pnwActions = pnwSlot("actions", "刷新", "button"); pnwBlock.append(pnwContext, pnwActions);
    pnwCheck.click(); pnwActions.click();
    expect(pnwCheck.checked).toBe(true); expect(pnwBlock.open).toBe(true); expect(pnwChanged).not.toHaveBeenCalled();
    expect(pnwToggle(pnwBlock).querySelector('slot[name="actions"],slot[name="context"]')).toBeNull();
    await vi.waitFor(() => expect(pnwRoot.querySelector('[part="header"]')!.hasAttribute("data-has-context")).toBe(true));
    pnwContext.remove();
    await vi.waitFor(() => expect(pnwRoot.querySelector('[part="header"]')!.hasAttribute("data-has-context")).toBe(false));
  });

  it("updates accessible names from title content without adding status or action text", async () => {
    const pnwBlock = pnwMount(); pnwBlock.append(pnwSlot("status", "3 项"), pnwSlot("actions", "保存", "button"));
    await vi.waitFor(() => expect(pnwToggle(pnwBlock).getAttribute("aria-label")).toBe("示例内容"));
    pnwBlock.querySelector('[slot="title"]')!.textContent = "新\n 标题";
    await vi.waitFor(() => expect(pnwToggle(pnwBlock).getAttribute("aria-label")).toBe("新 标题"));
    pnwBlock.querySelector('[slot="title"]')!.replaceWith(pnwSlot("title", "替换标题"));
    await vi.waitFor(() => expect(pnwToggle(pnwBlock).getAttribute("aria-label")).toBe("替换标题"));
  });

  it("uses a real static heading instead of a disabled button while retaining slots and stable parts", async () => {
    const pnwBlock = pnwMount(), pnwChanged = vi.fn(), pnwTitle = pnwBlock.querySelector('[slot="title"]');
    pnwBlock.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwChanged); pnwBlock.open = false; pnwBlock.collapsible = false;
    expect(pnwBlock.hasAttribute("non-collapsible")).toBe(true); expect(pnwBody(pnwBlock).hidden).toBe(false);
    expect(pnwToggle(pnwBlock).tagName).toBe("DIV"); expect(pnwToggle(pnwBlock).getAttribute("role")).toBe("heading");
    expect(pnwToggle(pnwBlock).getAttribute("aria-level")).toBe("3"); expect(pnwToggle(pnwBlock).hasAttribute("aria-expanded")).toBe(false);
    expect(pnwToggle(pnwBlock).hasAttribute("tabindex")).toBe(false); expect(pnwToggle(pnwBlock).hasAttribute("disabled")).toBe(false);
    expect(pnwBlock.shadowRoot!.querySelector<HTMLElement>('[part="chevron"]')!.hidden).toBe(true);
    pnwToggle(pnwBlock).click(); expect(pnwChanged).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(pnwToggle(pnwBlock).getAttribute("aria-label")).toBe("示例内容"));
    pnwBlock.collapsible = true; expect(pnwToggle(pnwBlock).tagName).toBe("BUTTON"); expect(pnwBody(pnwBlock).hidden).toBe(true);
    expect(pnwBlock.querySelector('[slot="title"]')).toBe(pnwTitle);
    pnwToggle(pnwBlock).click(); expect(pnwChanged).toHaveBeenCalledOnce();
  });

  it("preserves caller nodes, drafts, selection, expansion and its own DOM across changes and reconnection", () => {
    const pnwBlock = pnwMount(), pnwContent = pnwBlock.querySelector('[slot="body"]')!, pnwInput = document.createElement("input");
    pnwInput.value = "retained draft"; pnwContent.append(pnwInput); pnwInput.focus(); pnwInput.setSelectionRange(2, 7);
    const pnwInternalBody = pnwBody(pnwBlock), pnwInternalToggle = pnwToggle(pnwBlock);
    pnwBlock.level = "secondary"; pnwBlock.open = false; pnwBlock.open = true;
    expect(pnwBlock.querySelector('[slot="body"]')).toBe(pnwContent); expect(pnwContent.querySelector("input")).toBe(pnwInput);
    expect(pnwInput.value).toBe("retained draft"); expect(pnwInput.selectionStart).toBe(2); expect(pnwInput.selectionEnd).toBe(7);
    pnwBlock.open = false; pnwBlock.remove(); document.body.append(pnwBlock);
    expect(pnwBlock.open).toBe(false); expect(pnwBody(pnwBlock)).toBe(pnwInternalBody); expect(pnwToggle(pnwBlock)).toBe(pnwInternalToggle);
    expect(pnwContent.querySelector("input")).toBe(pnwInput);
  });

  it("restores own property presets, supports preconnection collapse and isolates nested Blocks", () => {
    const pnwParent = pnwMount(), pnwChild = document.createElement(PNW_CONTENT_BLOCK_TAG), pnwChanged = vi.fn();
    Object.defineProperty(pnwChild, "open", { configurable: true, writable: true, value: false });
    Object.defineProperty(pnwChild, "level", { configurable: true, writable: true, value: "secondary" });
    pnwParent.querySelector('[slot="body"]')!.append(pnwChild); pnwParent.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwChanged);
    expect(pnwChild.open).toBe(false); expect(pnwChild.level).toBe("secondary");
    pnwToggle(pnwChild).click(); expect(pnwChild.open).toBe(true); expect(pnwParent.open).toBe(true); expect(pnwChanged).toHaveBeenCalledOnce();
    expect(pnwBody(pnwParent).id).not.toBe(pnwBody(pnwChild).id);
    expect(pnwToggle(pnwChild).getAttribute("aria-controls")).toBe(pnwBody(pnwChild).id);
  });

  it("registers the serialized factory with a pure event adapter and no module captures", () => {
    const pnwClass = new Function(`return (${pnwCreateContentBlockClass.toString()})({toggleEventType:'pnw-fixture-toggle'})`)() as typeof PnwContentBlock;
    const pnwTag = "pnw-content-block-serialized-test"; customElements.define(pnwTag, pnwClass);
    const pnwBlock = document.createElement(pnwTag) as PnwContentBlock, pnwDefault = vi.fn(), pnwCustom = vi.fn(); document.body.append(pnwBlock);
    pnwBlock.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, pnwDefault); pnwBlock.addEventListener("pnw-fixture-toggle", pnwCustom);
    pnwToggle(pnwBlock).click(); expect(pnwBlock.open).toBe(false); expect(pnwDefault).not.toHaveBeenCalled();
    expect(pnwCustom).toHaveBeenCalledWith(expect.objectContaining({ detail: { expanded: false } }));
  });

  it("has one compact primary/secondary baseline, no scroll ownership and only prefixed private CSS classes", () => {
    const pnwBlock = pnwMount(), pnwStyle = pnwBlock.shadowRoot!.querySelector("style")!.textContent!;
    expect(pnwStyle).toContain("min-height:30px"); expect(pnwStyle).toContain("min-height:26px");
    expect(pnwStyle).toContain("--pnw-content-block-header-background"); expect(pnwStyle).toContain("--vscode-sideBarSectionHeader-background");
    expect(pnwStyle).not.toMatch(/overflow(?:-[xy])?:\s*(?:auto|scroll)|height:\s*100%/u);
    expect(Array.from(pnwBlock.shadowRoot!.querySelectorAll<HTMLElement>("[class]")).flatMap(pnwNode => Array.from(pnwNode.classList)).every(pnwClass => pnwClass.startsWith("pnw-"))).toBe(true);
  });
});
