// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElDialog } from "element-plus";
import PnwAppModalOverlay from "./PnwAppModalOverlay.vue";
import PnwChoiceDialogHost from "./PnwChoiceDialogHost.vue";
import { pnwPromptChoice, pnwResolveChoice } from "../composables/pnwChoiceDialog.js";
import { pnwGetDocumentModalStack, type PnwModalLayer } from "../utils/pnwModalStack.js";
const cleanups: (() => void)[] = [];
async function flush() { await nextTick(); await nextTick(); await nextTick(); }
function key(key: string, shiftKey = false) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
}
function prompt(parentLayer?: PnwModalLayer) {
  return pnwPromptChoice({ title: "Confirm", message: "Continue?", parentLayer,
    choices: [{ id: "confirm", label: "Continue" }, { id: "cancel", label: "Cancel" }], defaultChoiceId: "cancel" });
}
afterEach(async () => {
  pnwResolveChoice(null);
  for (const dispose of cleanups.splice(0).reverse()) dispose();
  await flush(); document.body.innerHTML = "";
});
describe("document modal ownership", () => {
  it("places Wing choice above a parent opened later than the global host; Escape preserves the parent and restores its trigger", async () => {
    const host = mount(PnwChoiceDialogHost, { attachTo: document.body }); cleanups.push(() => host.unmount());
    const parent = mount(PnwAppModalOverlay, { props: { open: true, zIndex: 3100 }, attachTo: document.body,
      slots: { default: '<button id="pnw-parent-trigger">Ask</button>' } }); cleanups.push(() => parent.unmount());
    await flush(); const trigger = document.getElementById("pnw-parent-trigger")!; trigger.focus();
    const result = prompt(); await flush();
    const panels = [...document.querySelectorAll<HTMLElement>(".pnw-modal-panel")];
    const choice = document.querySelector<HTMLElement>(".pnw-choice-dialog")!;
    const parentPanel = panels.find(panel => panel !== choice)!;
    expect(Number(choice.parentElement!.style.zIndex)).toBeGreaterThan(Number(parentPanel.parentElement!.style.zIndex));
    expect(parentPanel.getAttribute("aria-modal")).toBe("false");
    trigger.focus(); expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("cancel");
    key("Tab"); expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("confirm");
    key("Tab", true); expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe("cancel");
    key("Escape"); expect(await result).toMatchObject({ choiceId: null }); await flush();
    expect(parent.emitted("close")).toBeUndefined(); expect(document.activeElement).toBe(trigger);
    key("Escape"); expect(parent.emitted("close")).toHaveLength(1);
  });

  it("registers a third-party layer above 2000 and updates layer ownership when a choice opens", async () => {
    const external = document.createElement("div"); const trigger = document.createElement("button"); external.append(trigger); document.body.append(external);
    const onClose = vi.fn(); const changes: boolean[] = [];
    const stack = pnwGetDocumentModalStack(document);
    const layer = stack.register({ element: () => external, baseZIndex: 5800, onClose,
      onChange: state => { external.style.zIndex = String(state.zIndex); changes.push(state.isTopmost); } });
    cleanups.push(() => layer.dispose());
    const host = mount(PnwChoiceDialogHost, { attachTo: document.body }); cleanups.push(() => host.unmount());
    trigger.focus();
    // Vue may wrap injected public handles; their ownership identity must stay stable.
    const result = prompt(ref(layer).value); await flush();
    const choice = document.querySelector<HTMLElement>(".pnw-choice-dialog")!;
    expect(Number(choice.parentElement!.style.zIndex)).toBeGreaterThan(5800);
    layer.updateBaseZIndex(6200); await flush();
    expect(Number(choice.parentElement!.style.zIndex)).toBeGreaterThan(6200);
    expect(changes.at(-1)).toBe(false);
    key("Escape"); await result; await flush();
    expect(onClose).not.toHaveBeenCalled(); expect(changes.at(-1)).toBe(true); expect(document.activeElement).toBe(trigger);
    key("Escape"); expect(onClose).toHaveBeenCalledWith("escape");
  });


  it("keeps a real Element Plus dialog focus trap compatible through an owned child container", async () => {
    const content = ref<HTMLElement | null>(null);
    const childContainer = ref<HTMLElement | null>(null);
    const zIndex = ref(5300); const visible = ref(true);
    const fixture = defineComponent({ setup: () => () => h(ElDialog, {
      modelValue: visible.value, appendToBody: true, zIndex: zIndex.value,
      closeOnPressEscape: false, 'onUpdate:modelValue': (value: boolean) => { visible.value = value; },
    }, { default: () => h('div', { ref: content }, [h('button', { id: 'pnw-external-trigger' }, 'Ask'), h('div', { ref: childContainer })]) }) });
    const host = mount(PnwChoiceDialogHost, { attachTo: document.body }); cleanups.push(() => host.unmount());
    const external = mount(fixture, { attachTo: document.body }); cleanups.push(() => external.unmount());
    await flush(); await new Promise(resolve => setTimeout(resolve, 25));
    const layer = pnwGetDocumentModalStack(document).register({
      element: () => content.value, childContainer: () => childContainer.value, baseZIndex: zIndex.value,
      onChange: state => { zIndex.value = state.zIndex; }, onClose: () => { visible.value = false; },
    }); cleanups.push(() => layer.dispose());
    const trigger = document.getElementById('pnw-external-trigger')!; trigger.focus();
    const result = prompt(layer); await flush(); await new Promise(resolve => setTimeout(resolve, 30));
    const choice = document.querySelector<HTMLElement>('.pnw-choice-dialog')!;
    expect(childContainer.value!.contains(choice)).toBe(true);
    expect(Number(choice.parentElement!.style.zIndex)).toBeGreaterThan(zIndex.value);
    expect((document.activeElement as HTMLElement).dataset.pnwChoiceId).toBe('cancel');
    key('Escape'); expect(await result).toMatchObject({ choiceId: null }); await flush();
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(visible.value).toBe(true); expect(document.activeElement).toBe(trigger);
  });


  it("rebinds a replaced request to its new live sibling owner and child container", async () => {
    const make = () => { const element = document.createElement('div'); element.tabIndex = -1; const trigger = document.createElement('button'); element.append(trigger); document.body.append(element); return element; };
    const stack = pnwGetDocumentModalStack(document);
    const rootElement = make(); const root = stack.register({element: () => rootElement}); cleanups.push(() => root.dispose());
    const aElement = make(); const aContainer = document.createElement('div'); aElement.append(aContainer);
    const a = stack.register({element: () => aElement, childContainer: () => aContainer, parentLayer: root}); cleanups.push(() => a.dispose());
    const bElement = make(); const bContainer = document.createElement('div'); bElement.append(bContainer);
    const b = stack.register({element: () => bElement, childContainer: () => bContainer, parentLayer: root}); cleanups.push(() => b.dispose());
    const host = mount(PnwChoiceDialogHost, {attachTo: document.body}); cleanups.push(() => host.unmount());
    const first = prompt(a); await flush(); expect(aContainer.querySelector('.pnw-choice-dialog')).not.toBeNull();
    const second = prompt(b); expect(await first).toMatchObject({choiceId: null}); await flush();
    expect(bContainer.querySelector('.pnw-choice-dialog')).not.toBeNull();
    let settled = false; void second.then(() => { settled = true; });
    a.dispose(); await flush(); expect(settled).toBe(false);
    expect(bContainer.querySelector('.pnw-choice-dialog')).not.toBeNull();
    key('Escape'); expect(await second).toMatchObject({choiceId: null});
  });

  it("owner disposal cancels the pending choice; unmount settles requests and removes global listeners", async () => {
    const opener = document.createElement("button"); document.body.append(opener); opener.focus();
    const parent = mount(PnwAppModalOverlay, { props: { open: true }, attachTo: document.body, slots: { default: '<button>Parent</button>' } });
    await flush(); const host = mount(PnwChoiceDialogHost, { attachTo: document.body });
    const first = prompt(); await flush(); parent.unmount();
    expect(await first).toMatchObject({ choiceId: null }); await flush(); expect(document.activeElement).toBe(opener);
    const second = prompt(); await flush(); host.unmount(); expect(await second).toMatchObject({ choiceId: null }); await flush();
    expect(pnwGetDocumentModalStack(document).topLayer).toBeUndefined();
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true }); window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("rejects stale or cross-document parents and disposes descendants without orphan layers", () => {
    const element = () => { const root = document.createElement("div"); root.tabIndex = -1; document.body.append(root); return root; };
    const first = element(); const second = element(); const stack = pnwGetDocumentModalStack(document);
    const a = stack.register({ element: () => first });
    const b = stack.register({ element: () => second }); cleanups.push(() => b.dispose());
    // Register an independent later owner through a second stack document is never accepted.
    const otherDocument = document.implementation.createHTMLDocument("Other");
    expect(() => pnwGetDocumentModalStack(otherDocument).register({ element: () => otherDocument.body, parentLayer: a })).toThrow(TypeError);
    // Disposing the owning ancestor also disposes b rather than leaving an orphan layer.
    a.dispose(); expect(b.disposed).toBe(true); a.dispose();
    expect(() => stack.register({ element: () => first, parentLayer: a })).toThrow(TypeError);
  });
});
