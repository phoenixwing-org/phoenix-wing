// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PNW_CODE_REORDER_MEMBERS_PANEL_ACTION, pnwCodeDefineReorderMembersPanel } from "./PnwCodeReorderMembersPanel.js";
import type { PnwCodeReorderMembersPanelModel } from "./PnwCodeReorderMembersPanelState.js";

afterEach(() => document.body.replaceChildren());

function setup(reorderRevision?: number) {
  pnwCodeDefineReorderMembersPanel();
  const element = document.createElement("pnw-code-reorder-members-panel");
  const model: PnwCodeReorderMembersPanelModel = {
    presentation: "results", status: "done", reorderRevision,
    reorderResults: [{ uri: "file:///Sample.h", relativePath: "Sample.h", kind: "header", encoding: "UTF-8", changed: true, state: "pending", warnings: [] }],
    reorderSelectedUris: ["file:///Sample.h"],
  };
  element.model = model; document.body.append(element);
  const received = vi.fn(); element.addEventListener(PNW_CODE_REORDER_MEMBERS_PANEL_ACTION, event => received((event as CustomEvent).detail));
  return { element, model, received };
}

describe("reorder result event revisions", () => {
  it("opens the pending comparison from the file label and the source from the 查看 button", () => {
    const { element, received } = setup(3);
    element.shadowRoot!.querySelector<HTMLElement>(".file-main")!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "preview", uris: ["file:///Sample.h"], reorderRevision: 3 });
    const view = element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="查看"]')!;
    expect(view.getAttribute("aria-label")).toBe("查看");
    expect(element.shadowRoot!.querySelector('button[title="预览排序差异"]')).toBeNull();
    view.click();
    expect(received).toHaveBeenCalledTimes(2);
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "open", uris: ["file:///Sample.h"], reorderRevision: 3 });
  });

  it("uses independent open and preview capabilities for the two entry points", () => {
    const { element, model, received } = setup(3);
    element.model = { ...model, capabilities: { open: false, preview: true } };
    expect(element.shadowRoot!.querySelector('button[title="查看"]')).toBeNull();
    element.shadowRoot!.querySelector<HTMLElement>(".file-main")!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "preview", uris: ["file:///Sample.h"], reorderRevision: 3 });
    element.model = { ...model, capabilities: { open: true, preview: false } };
    received.mockClear();
    element.shadowRoot!.querySelector<HTMLElement>(".file-main")!.click();
    expect(received).not.toHaveBeenCalled();
    element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="查看"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "open", uris: ["file:///Sample.h"], reorderRevision: 3 });
  });

  it("opens Git comparison for applied files and leaves revert explicit", () => {
    const { element, model, received } = setup(3);
    element.model = { ...model, reorderResults: [{ ...model.reorderResults![0]!, state: "applied" }] };
    element.shadowRoot!.querySelector<HTMLElement>(".file-main")!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "gitDiff", uris: ["file:///Sample.h"], reorderRevision: 3 });
    expect(element.shadowRoot!.querySelector('button[title="还原本次成员排序"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('button[title="查看"]')).toBeNull();
  });

  it.each(["reverted", "unchanged"] as const)("keeps %s rows static because no pending comparison exists", (state) => {
    const { element, model, received } = setup(3);
    element.model = { ...model, reorderResults: [{ ...model.reorderResults![0]!, state }] };
    const main = element.shadowRoot!.querySelector<HTMLElement>(".file-main")!;
    expect(main.classList.contains("static")).toBe(true);
    main.click();
    expect(received).not.toHaveBeenCalled();
  });

  it("keeps pending rows static when running or when comparison capability is disabled", () => {
    const { element, model, received } = setup(3);
    for (const update of [{ status: "running" as const }, { capabilities: { preview: false, open: true } }]) {
      element.model = { ...model, ...update };
      const main = element.shadowRoot!.querySelector<HTMLElement>(".file-main")!;
      expect(main.classList.contains("static")).toBe(true); main.click();
    }
    expect(received).not.toHaveBeenCalled();
  });

  it("emits the rendered revision with actions and selection", () => {
    const { element, received } = setup(3);
    element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: ["file:///Sample.h"], reorderRevision: 3 });
    const selected = element.shadowRoot!.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!;
    selected.checked = false; selected.dispatchEvent(new Event("change"));
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderSelection", uris: [], reorderRevision: 3 });
  });

  it("rejects detached old rows even when a new scan reuses the same file URI", () => {
    const { element, model, received } = setup(3);
    const oldApply = element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!;
    const oldAll = element.shadowRoot!.querySelector<HTMLInputElement>('input[aria-label="选择全部待写盘文件"]')!;
    const oldView = element.shadowRoot!.querySelector<HTMLElement>(".file-main")!;
    const oldViewButton = element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="查看"]')!;
    element.model = { ...model, reorderRevision: 4, reorderSelectedUris: [] };
    oldApply.click(); oldView.click(); oldViewButton.click(); oldAll.checked = true; oldAll.dispatchEvent(new Event("change"));
    expect(received).not.toHaveBeenCalled();
    expect(element.shadowRoot!.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!.checked).toBe(false);
    element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: ["file:///Sample.h"], reorderRevision: 4 });
  });

  it("retains the existing event shape when no revision contract is supplied", () => {
    const { element, received } = setup();
    element.shadowRoot!.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: ["file:///Sample.h"] });
  });
});

describe("reorder result filters", () => {
  function setupMixed() {
    const context = setup(3);
    const base = context.model.reorderResults![0]!;
    context.element.model = {
      ...context.model,
      reorderResults: [
        base,
        { ...base, uri: "file:///Blocked.h", relativePath: "Blocked.h", state: "blocked", changed: false, warnings: ["Protected region"] },
        { ...base, uri: "file:///Same.h", relativePath: "Same.h", state: "unchanged", changed: false },
        { ...base, uri: "file:///Applied.h", relativePath: "Applied.h", state: "applied" },
        { ...base, uri: "file:///Reverted.h", relativePath: "Reverted.h", state: "reverted" },
        { ...base, uri: "file:///Removed.h", relativePath: "Removed.h", state: "cancelled" },
      ],
    };
    return context;
  }

  it("offers visible counted filters in results and shows all non-cancelled rows by default", () => {
    const { element } = setupMixed();
    const root = element.shadowRoot!;
    const filters = root.querySelector<HTMLElement>(".result-filters")!;
    expect(element.getAttribute("presentation")).toBe("results");
    expect(filters.hidden).toBe(false);
    expect(filters.closest(".options,.actions")).toBeNull();
    expect(getComputedStyle(filters).display).not.toBe("none");
    expect(root.querySelector('[data-filter="all"]')?.textContent).toBe("全部 · 5");
    expect(root.querySelector('[data-filter="normal"]')?.textContent).toBe("正常 · 4");
    expect(root.querySelector('[data-filter="error"]')?.textContent).toBe("错误 · 1");
    expect(root.querySelector('[data-filter="all"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelectorAll('.result-filter-button[aria-pressed="true"]')).toHaveLength(1);
    expect(root.querySelectorAll(".file-row")).toHaveLength(5);
    expect(root.textContent).toContain("Same.h");
    expect(root.textContent).not.toContain("Removed.h");
    expect(root.textContent).not.toContain("显示无变更文件");
    const blockedGroup = [...root.querySelectorAll<HTMLElement>(".group")].find(group => group.querySelector(".state.blocked"))!;
    expect(blockedGroup.querySelector(".group-header")?.textContent).toContain("错误 / 已阻止 · 1 个");
    expect(blockedGroup.querySelector("input")).toBeNull();
    expect(blockedGroup.querySelector<HTMLButtonElement>('button[title="未生成候选，无法应用"]')!.disabled).toBe(true);
  });

  it("filters display without Host events or changes to the pending selection", () => {
    const { element, received } = setupMixed();
    const root = element.shadowRoot!;
    const selected = root.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!;
    selected.checked = false; selected.dispatchEvent(new Event("change"));
    received.mockClear();
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    expect(root.querySelectorAll(".file-row")).toHaveLength(1);
    expect(root.querySelector(".file-name")?.textContent).toBe("Blocked.h");
    expect(root.querySelector(".groups input")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[title="未生成候选，无法应用"]')!.disabled).toBe(true);
    expect(root.querySelector('[data-filter="error"]')?.getAttribute("aria-pressed")).toBe("true");
    root.querySelector<HTMLButtonElement>('[data-filter="normal"]')!.click();
    expect(root.querySelectorAll(".file-row")).toHaveLength(4);
    expect(root.querySelector(".state.blocked")).toBeNull();
    expect(root.querySelector(".state.unchanged")).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!.checked).toBe(false);
    expect(root.querySelector('[data-filter="all"]')?.textContent).toBe("全部 · 5");
    root.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(root.querySelectorAll(".file-row")).toHaveLength(5);
    expect(root.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!.checked).toBe(false);
    expect(received).not.toHaveBeenCalled();
  });

  it("explains hidden pending selection in the error filter and never applies blocked rows", () => {
    const { element, received } = setupMixed();
    element.model = { ...element.model!, presentation: "detailBlock", reorderSelectedUris: ["file:///Sample.h", "file:///Blocked.h"] };
    const root = element.shadowRoot!;
    expect(root.querySelector(".hidden-selection-note")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    expect(root.querySelector(".hidden-selection-note")?.textContent).toBe("已选 1 个正常文件（当前隐藏），应用所选仍包含这些文件。");
    expect(received).not.toHaveBeenCalled();
    [...root.querySelectorAll<HTMLButtonElement>(".actions button")].find(button => button.textContent === "应用所选（1）")!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: ["file:///Sample.h"], reorderRevision: 3 });
    root.querySelector<HTMLButtonElement>('[data-filter="normal"]')!.click();
    expect(root.querySelector(".hidden-selection-note")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    element.model = { ...element.model!, reorderSelectedUris: [] };
    expect(root.querySelector(".hidden-selection-note")).toBeNull();
  });

  it("returns keyboard focus to the new filter button after rendering", () => {
    const { element, received } = setupMixed();
    const root = element.shadowRoot!;
    for (const value of ["error", "normal", "all"]) {
      const previous = root.querySelector<HTMLButtonElement>(`[data-filter="${value}"]`)!;
      previous.focus(); previous.click();
      const current = root.querySelector<HTMLButtonElement>(`[data-filter="${value}"]`)!;
      expect(current).not.toBe(previous);
      expect(root.activeElement).toBe(current);
      expect(current.getAttribute("aria-pressed")).toBe("true");
    }
    expect(received).not.toHaveBeenCalled();
  });

  it("keeps old revision actions rejected after switching filters and receiving a new scan", () => {
    const { element, received } = setupMixed();
    const root = element.shadowRoot!;
    const oldApply = root.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!;
    const oldSelection = root.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!;
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    element.model = { ...element.model!, reorderRevision: 4, reorderSelectedUris: [] };
    oldApply.click(); oldSelection.checked = true; oldSelection.dispatchEvent(new Event("change"));
    root.querySelector<HTMLButtonElement>('[data-filter="normal"]')!.click();
    expect(received).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLInputElement>('input[aria-label="选择 Sample.h"]')!.checked).toBe(false);
    root.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: ["file:///Sample.h"], reorderRevision: 4 });
  });

  it("shows an empty error result without selection controls when nothing is blocked", () => {
    const { element, received } = setup(3);
    const root = element.shadowRoot!;
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    expect(root.querySelector(".group-header")?.textContent).toContain("错误 / 已阻止 · 0 个");
    expect(root.querySelector(".groups input,.groups button,.file-row")).toBeNull();
    expect(root.querySelector(".groups .empty")?.textContent).toBe("没有文件");
    expect(received).not.toHaveBeenCalled();
  });
});

describe("individual blocked candidate actions", () => {
  function blocked(available = false, viewed = false) {
    const context = setup(3);
    context.element.model = { ...context.model, reorderResults: [{ ...context.model.reorderResults![0]!, state: "blocked",
      changed: false, warnings: ["Review required"], reviewCandidateAvailable: available, reviewCandidateViewed: viewed }], reorderSelectedUris: [] };
    return context;
  }

  it("offers keyboard-accessible diagnostics with no checkbox or invented candidate", () => {
    const { element, received } = blocked(); const root = element.shadowRoot!;
    expect(root.querySelector(".file-row input")).toBeNull();
    root.querySelector<HTMLButtonElement>('button[title="打开源文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "open", uris: ["file:///Sample.h"], reorderRevision: 3 });
    const label = root.querySelector<HTMLElement>(".file-main")!;
    expect(label.role).toBe("button"); expect(label.tabIndex).toBe(0);
    expect(label.getAttribute("aria-label")).toBe("查看阻止原因（未生成候选）：Sample.h");
    label.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "preview", uris: ["file:///Sample.h"], reorderRevision: 3 });
    received.mockClear();
    const apply = root.querySelector<HTMLButtonElement>('button[title="未生成候选，无法应用"]')!;
    expect(apply.disabled).toBe(true); apply.dispatchEvent(new MouseEvent("click")); expect(received).not.toHaveBeenCalled();
  });

  it("does not mark a candidate viewed locally and waits for the Host to enable individual application", () => {
    const { element, received } = blocked(true); const root = element.shadowRoot!;
    root.querySelector<HTMLButtonElement>('button[title="查看阻止原因与候选差异"]')!.click();
    const before = root.querySelector<HTMLButtonElement>('button[title="先查看候选差异，再单独确认应用"]')!;
    expect(before.disabled).toBe(true);
    element.model = { ...element.model!, reorderResults: [{ ...element.model!.reorderResults![0]!, reviewCandidateViewed: true }] };
    const apply = root.querySelector<HTMLButtonElement>('button[title="单独确认应用此候选"]')!;
    expect(apply.disabled).toBe(false); expect(apply.getAttribute("aria-label")).toBe("单独确认应用此候选");
    apply.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "reviewApply", uris: ["file:///Sample.h"], reorderRevision: 3 });
    expect(root.querySelector(".file-row input")).toBeNull();
  });

  it("rejects stale review buttons, current running state and revoked apply capability", () => {
    const { element, received } = blocked(true, true); const root = element.shadowRoot!;
    const previous = element.model!;
    const oldApply = root.querySelector<HTMLButtonElement>('button[title="单独确认应用此候选"]')!;
    const oldPreview = root.querySelector<HTMLButtonElement>('button[title="查看阻止原因与候选差异"]')!;
    element.model = { ...previous, reorderRevision: 4 };
    oldApply.click(); oldPreview.click(); expect(received).not.toHaveBeenCalled();
    element.model = { ...previous, status: "running" };
    expect(root.querySelector(".file-row button")).toBeNull();
    element.model = { ...previous, capabilities: { preview: true, apply: false } };
    expect(root.querySelector('button[title="单独确认应用此候选"]')).toBeNull();
    expect(root.querySelector('button[title="查看阻止原因与候选差异"]')).not.toBeNull();
  });
});
