// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  PNW_CLEANUP_DIALOG_ACTION,
  PnwCleanupDialog,
  pnwCodeDefineCleanupDialog,
  pnwNormalizeCleanupDialogModel,
  type PnwCleanupDialogActionDetail,
  type PnwCleanupDialogModel,
} from "./PnwCleanupDialog.js";

const PNW_TEST_CLEANUP_DIALOG_TAG = "pnw-cleanup-dialog-test";

function pnwCleanupDialogModel(
  patch: Partial<PnwCleanupDialogModel> = {},
): PnwCleanupDialogModel {
  return {
    title: "清理",
    description: "预览后执行",
    modes: [
      { id: "rules", label: "规则清理", risk: "normal", rulesVisible: true },
      { id: "git", label: "Git 强制清理", risk: "high", rulesVisible: false },
    ],
    selectedModeId: "rules",
    targets: [
      { id: "root", label: "ROOT", path: "/workspace/root", selected: true, supportedModeIds: ["rules"] },
      { id: "work", label: "工作目录", path: "/workspace/root/projects", selected: false, supportedModeIds: ["rules"] },
      { id: "repo", label: "仓库", path: "/workspace/root/repo", selected: true, supportedModeIds: ["git"] },
    ],
    rulesVisible: true,
    rulesLabel: "规则",
    rulesYaml: "delete:\n  directories:\n    - build",
    preview: { state: "idle", items: [] },
    previewEnabled: true,
    executeEnabled: false,
    previewLabel: "预览",
    executeLabel: "清理",
    cancelLabel: "取消",
    highRiskConfirmationLabel: "确认不可恢复操作",
    ...patch,
  };
}

function pnwMountCleanupDialog(model = pnwCleanupDialogModel()): PnwCleanupDialog {
  const dialog = document.createElement(PNW_TEST_CLEANUP_DIALOG_TAG) as PnwCleanupDialog;
  document.body.append(dialog);
  dialog.model = model;
  return dialog;
}

beforeAll(() => pnwCodeDefineCleanupDialog(PNW_TEST_CLEANUP_DIALOG_TAG));
afterEach(() => document.body.replaceChildren());

describe("PnwCleanupDialog", () => {
  it("规范化 Host 模型并过滤重复 id 与未知 mode", () => {
    const model = pnwNormalizeCleanupDialogModel(pnwCleanupDialogModel({
      selectedModeId: "missing",
      modes: [
        { id: "rules", label: "规则", risk: "normal" },
        { id: "rules", label: "重复", risk: "high" },
      ],
      targets: [
        { id: "root", label: "ROOT", path: "/root", selected: true, supportedModeIds: ["rules", "missing"] },
        { id: "root", label: "重复", path: "/other", selected: true },
      ],
    }));
    expect(model.modes).toHaveLength(1);
    expect(model.targets).toHaveLength(1);
    expect(model.selectedModeId).toBe("rules");
    expect(model.targets[0]?.supportedModeIds).toEqual(["rules"]);
    expect(Object.isFrozen(model)).toBe(true);
  });

  it("预览事件携带方式、当前目标与规则", () => {
    const dialog = pnwMountCleanupDialog();
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-preview-action")?.click();
    expect(actions).toEqual([{
      kind: "preview",
      request: {
        modeId: "rules",
        targetIds: ["root"],
        rulesYaml: "delete:\n  directories:\n    - build",
      },
    }]);
  });

  it("切换方式后只显示并提交该方式支持的目标", () => {
    const dialog = pnwMountCleanupDialog();
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    const select = dialog.shadowRoot?.querySelector<HTMLSelectElement>(".pnw-cleanup-mode");
    select!.value = "git";
    select?.dispatchEvent(new Event("change"));
    expect(dialog.shadowRoot?.querySelectorAll(".pnw-cleanup-target")).toHaveLength(1);
    expect(dialog.shadowRoot?.querySelector(".pnw-cleanup-rules")).toBeNull();
    expect(dialog.model.preview.state).toBe("idle");
    dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-preview-action")?.click();
    expect(actions.at(-1)).toMatchObject({
      kind: "preview",
      request: { modeId: "git", targetIds: ["repo"] },
    });
  });

  it("showModal 可接收方式并直接选择其可用目标", () => {
    const dialog = pnwMountCleanupDialog();
    dialog.showModal("git");

    expect(dialog.model.selectedModeId).toBe("git");
    expect(dialog.model.targets.filter(({ selected }) => selected).map(({ id }) => id)).toEqual(["repo"]);
    expect(dialog.shadowRoot?.querySelector(".pnw-cleanup-rules")).toBeNull();
    expect(dialog.shadowRoot?.querySelector("dialog")?.open).toBe(true);
  });

  it("高风险执行必须绑定 ready token 并由用户再次确认", () => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({
      selectedModeId: "git",
      rulesVisible: false,
      preview: { state: "ready", token: "accepted-preview", items: ["repo/a.tmp"] },
      executeEnabled: true,
    }));
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    const execute = dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute");
    expect(dialog.model.requireHighRiskConfirmation).toBe(true);
    expect(dialog.shadowRoot?.querySelector(".pnw-cleanup-confirm input")).not.toBeNull();
    expect(execute?.disabled).toBe(true);
    dialog.shadowRoot?.querySelector<HTMLInputElement>(".pnw-cleanup-confirm input")?.click();
    expect(dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute")?.disabled).toBe(false);
    dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute")?.click();
    expect(actions.at(-1)).toMatchObject({
      kind: "execute",
      previewToken: "accepted-preview",
      request: { modeId: "git", targetIds: ["repo"] },
    });
  });

  it("Host 可省略额外风险勾选，但仍显示高风险且执行携带冻结 token/方式/目标", () => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({
      selectedModeId: "git",
      requireHighRiskConfirmation: false,
      preview: { state: "ready", token: "run-preview", items: ["repo/a.tmp"] },
      executeEnabled: true,
    }));
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    expect(dialog.model.modes.find(({ id }) => id === "git")?.risk).toBe("high");
    const selectedMode = dialog.shadowRoot?.querySelector<HTMLOptionElement>('.pnw-cleanup-mode option[value="git"]');
    expect(selectedMode?.selected).toBe(true);
    expect(selectedMode?.textContent).toContain("高风险");
    expect(dialog.shadowRoot?.querySelector(".pnw-cleanup-confirm")).toBeNull();
    const execute = dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute");
    expect(execute?.disabled).toBe(false);
    expect(actions).toEqual([]);
    execute?.click();
    expect(actions).toEqual([{
      kind: "execute", previewToken: "run-preview",
      request: { modeId: "git", targetIds: ["repo"], rulesYaml: "delete:\n  directories:\n    - build" },
    }]);
  });

  it.each([
    { state: "idle", items: [] },
    { state: "ready", items: ["repo/a.tmp"] },
    { state: "loading", token: "old-token", items: [] },
  ] as const)("省略勾选不绕过有效 ready token 门禁：$state", (preview) => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({
      selectedModeId: "git", requireHighRiskConfirmation: false, preview, executeEnabled: true,
    }));
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    const execute = dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute");
    expect(execute?.disabled).toBe(true);
    execute?.click();
    // Programmatic dispatch must also respect the semantic gate, not only disabled styling.
    execute?.dispatchEvent(new MouseEvent("click"));
    expect(actions).toEqual([]);
  });

  it.each(["mode", "target"] as const)("省略勾选后改变 %s 仍使旧预览失效", (change) => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({
      selectedModeId: "git", requireHighRiskConfirmation: false,
      preview: { state: "ready", token: "old-preview", items: ["repo/a.tmp"] }, executeEnabled: true,
    }));
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => {
      actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail);
    });
    if (change === "mode") {
      const select = dialog.shadowRoot!.querySelector<HTMLSelectElement>(".pnw-cleanup-mode")!;
      select.value = "rules";
      select.dispatchEvent(new Event("change"));
    } else {
      dialog.shadowRoot?.querySelector<HTMLInputElement>(".pnw-cleanup-target input")?.click();
    }
    expect(dialog.model.preview.state).toBe("idle");
    expect(dialog.model.preview.token).toBeUndefined();
    const execute = dialog.shadowRoot?.querySelector<HTMLButtonElement>(".pnw-cleanup-execute");
    expect(execute?.disabled).toBe(true);
    execute?.dispatchEvent(new MouseEvent("click"));
    expect(actions.some(({ kind }) => kind === "execute")).toBe(false);
  });

  it("组件只发语义事件，不直接调用 Host、文件系统或 Git", () => {
    expect(PnwCleanupDialog.toString()).not.toMatch(
      /acquireVsCodeApi|postMessage|workspaceState|node:fs|execFile|git reset|git clean/iu,
    );
  });

  it("默认保留select，新workspace slot在唯一滚动body首位，说明不占用错误grid轨道", () => {
    const dialog = pnwMountCleanupDialog();
    const root = dialog.shadowRoot!;
    const slot = root.querySelector<HTMLSlotElement>('slot[name="workspace"]')!;
    const workspace = document.createElement("section");
    workspace.slot = "workspace"; workspace.textContent = "Host-owned YAML workspace";
    dialog.append(workspace);
    expect(dialog.model.modePresentation).toBe("select");
    expect(root.querySelector(".pnw-cleanup-mode")).not.toBeNull();
    expect(root.querySelector("details")).toBeNull();
    expect(root.querySelectorAll(".pnw-cleanup-footer button")).toHaveLength(3);
    expect(root.querySelectorAll(".pnw-cleanup-header-actions button")).toHaveLength(0);
    expect(root.querySelector<HTMLElement>(".pnw-cleanup-footer")!.hidden).toBe(false);
    const body = root.querySelector(".pnw-cleanup-content")!;
    expect(body.children[0]).toBe(slot);
    expect(body.children[1]).toBe(root.querySelector(".pnw-cleanup-description"));
    expect(root.querySelector(".pnw-cleanup-shell")!.children).toHaveLength(3);
    expect(root.querySelector("dialog")!.getAttribute("aria-labelledby")).toBe(root.querySelector("h2")!.id);
    dialog.model = { ...dialog.model, description: "Updated", preview: { state: "ready", token: "new", items: [] } };
    expect(root.querySelector('slot[name="workspace"]')).toBe(slot);
    expect(dialog.querySelector('[slot="workspace"]')).toBe(workspace);
    expect(slot.assignedElements()).toContain(workspace);
  });

  it.each([
    { actionsPlacement: "footer", modePresentation: "select", collapsibleSections: false },
    { actionsPlacement: "header", modePresentation: "radio", collapsibleSections: true },
  ] as const)("$actionsPlacement/$modePresentation 顶边固定、底部自适应，折叠和换方式不恢复居中", (layout) => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel(layout));
    const root = dialog.shadowRoot!;
    const assertPositionContract = () => {
      const css = root.querySelector("style")!.textContent!;
      const rule = /\.pnw-cleanup-dialog\s*\{([^}]+)\}/u.exec(css)?.[1];
      expect(rule).toBeDefined();
      const style = document.createElement("div").style;
      // happy-dom's declaration parser does not discard leading CSS comments.
      style.cssText = rule!.replace(/\/\*[\s\S]*?\*\//gu, "");
      expect(style.position).toBe("fixed");
      expect(style.top).toBe("16px");
      expect(style.bottom).toBe("auto");
      expect(style.marginTop).toBe("0px");
      expect(style.marginBottom).toBe("0px");
      expect(style.marginLeft).toBe("auto");
      expect(style.marginRight).toBe("auto");
      // No fixed height or centering translation: content controls the lower edge.
      expect(style.height).toBe("");
      expect(style.transform).toBe("");
    };
    assertPositionContract();
    root.querySelector<HTMLElement>("details > summary")?.click();
    dialog.showModal("git");
    assertPositionContract();
    expect(dialog.model.modes.find(({ id }) => id === "git")?.risk).toBe("high");
    expect(root.querySelector(".pnw-cleanup-confirm")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".pnw-cleanup-execute")!.disabled).toBe(true);
    dialog.close(); dialog.showModal("rules");
    assertPositionContract();
  });

  it("Header模式只移动原按钮与事件，Host操作slot不重复且可切回默认footer", () => {
    const dialog = pnwMountCleanupDialog();
    const root = dialog.shadowRoot!;
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail));
    const controls = ["cancel", "preview-action", "execute"].map((name) => root.querySelector<HTMLButtonElement>(`.pnw-cleanup-${name}`)!);
    const slot = root.querySelector<HTMLSlotElement>('slot[name="header-actions"]')!;
    const hostAction = document.createElement("button");
    hostAction.slot = "header-actions"; hostAction.textContent = "探测配置";
    dialog.append(hostAction);
    for (const actionsPlacement of ["header", "header", "footer", "header"] as const) {
      dialog.model = { ...dialog.model, actionsPlacement };
      const parent = root.querySelector(actionsPlacement === "header" ? ".pnw-cleanup-header-actions" : ".pnw-cleanup-footer");
      for (const control of controls) {
        expect(control.parentElement).toBe(parent);
        expect(root.querySelectorAll(`.${control.classList[1]}`)).toHaveLength(1);
      }
      expect(root.querySelector<HTMLElement>(".pnw-cleanup-footer")!.hidden).toBe(actionsPlacement === "header");
      expect(root.querySelector('slot[name="header-actions"]')).toBe(slot);
      expect(slot.assignedElements()).toEqual([hostAction]);
    }
    controls[1]!.click();
    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("preview");
  });

  it("三个内部block整行summary独立折叠，刷新/切换模式/关闭重开保留状态", () => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({ collapsibleSections: true, modePresentation: "radio", actionsPlacement: "header" }));
    const root = dialog.shadowRoot!;
    const blocks = () => Array.from(root.querySelectorAll<HTMLDetailsElement>("details"));
    const find = (title: string) => blocks().find((block) => block.dataset.section === title)!;
    expect(blocks().map((block) => block.dataset.section)).toEqual(["清理目标", "规则", "预览结果"]);
    expect(blocks().every((block) => block.open)).toBe(true);
    const events: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => events.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail));
    for (const title of ["清理目标", "规则"]) {
      const summary = find(title).querySelector("summary")!;
      const text = document.createElement("span"); text.textContent = summary.textContent;
      summary.replaceChildren(text); text.click();
      expect(find(title).open).toBe(false);
    }
    expect(find("预览结果").open).toBe(true);
    expect(events).toEqual([]);
    dialog.model = { ...dialog.model, preview: { state: "ready", token: "refreshed", items: ["new/build"] } };
    expect(blocks().map((block) => block.open)).toEqual([false, false, true]);
    dialog.showModal("git");
    expect(blocks().map((block) => block.dataset.section)).toEqual(["清理目标", "预览结果"]);
    expect(find("清理目标").open).toBe(false);
    dialog.close(); dialog.showModal("rules");
    expect(blocks().map((block) => block.open)).toEqual([false, false, true]);
    find("规则").querySelector("summary")!.click();
    expect(blocks().map((block) => block.open)).toEqual([false, true, true]);
  });

  it("radio单行呈现沿用事件/目标/风险门禁，方向键切换后保持焦点并使旧预检失效", () => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({ modePresentation: "radio",
      preview: { state: "ready", token: "old", items: ["old"] }, executeEnabled: true }));
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail));
    const root = dialog.shadowRoot!;
    expect(root.querySelector("select")).toBeNull();
    expect(root.querySelector('[role="radiogroup"]')!.getAttribute("aria-label")).toBe("清理方式");
    const first = root.querySelector<HTMLInputElement>('.pnw-cleanup-mode-radio[value="rules"]')!;
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    const git = root.querySelector<HTMLInputElement>('.pnw-cleanup-mode-radio[value="git"]')!;
    expect(dialog.model.selectedModeId).toBe("git");
    expect(git.checked).toBe(true);
    expect(root.activeElement).toBe(git);
    expect(dialog.model.preview).toEqual({ state: "idle", items: [] });
    expect(dialog.model.targets.filter(({ selected }) => selected).map(({ id }) => id)).toEqual(["repo"]);
    expect(root.querySelector(".pnw-cleanup-confirm")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".pnw-cleanup-execute")!.disabled).toBe(true);
    expect(actions).toEqual([{ kind: "change-mode", modeId: "git" }]);
    git.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    expect(dialog.model.selectedModeId).toBe("rules");
    expect((root.activeElement as HTMLInputElement).value).toBe("rules");
  });

  it.each(["loading", "executing"] as const)("忙时%s拒绝radio/select程序事件和showModal换模式", (state) => {
    for (const modePresentation of ["select", "radio"] as const) {
      const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({ modePresentation, preview: { state, items: [] } }));
      const actions: PnwCleanupDialogActionDetail[] = [];
      dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail));
      const control = dialog.shadowRoot!.querySelector<HTMLInputElement | HTMLSelectElement>(modePresentation === "radio" ? '.pnw-cleanup-mode-radio[value="git"]' : "select")!;
      expect(control.disabled).toBe(true);
      if (control instanceof HTMLInputElement) control.checked = true;
      else control.value = "git";
      control.dispatchEvent(new Event("change"));
      control.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      dialog.showModal("git");
      expect(dialog.model.selectedModeId).toBe("rules");
      expect(dialog.model.preview.state).toBe(state);
      expect(actions).toEqual([]);
    }
  });

  it("原生option配对前景背景，radio可横向滚动而不改变正式按钮色", () => {
    const dialog = pnwMountCleanupDialog();
    const css = dialog.shadowRoot!.querySelector("style")!.textContent!;
    expect(css).toContain(".pnw-cleanup-mode option { color: var(--vscode-dropdown-foreground");
    expect(css).toContain("background: var(--vscode-dropdown-background, var(--vscode-editor-background, Canvas))");
    expect(css).toContain(".pnw-cleanup-modes { display: flex; flex-wrap: nowrap;");
    expect(css).toContain("background: var(--vscode-button-secondaryBackground, #e5e5e5)");
    expect(css).toContain("background: var(--vscode-button-background, #0078d4)");
  });

  it.each([false, true])("ready后输入立即撤下旧预览并禁用执行，保留同一textarea焦点/选区/滚动：折叠布局=%s", (collapsibleSections) => {
    const dialog = pnwMountCleanupDialog(pnwCleanupDialogModel({
      collapsibleSections, actionsPlacement: collapsibleSections ? "header" : "footer",
      executeEnabled: true,
      preview: { state: "ready", token: "old", summary: "旧匹配结果", items: ["old/build"] },
    }));
    const root = dialog.shadowRoot!;
    const rules = root.querySelector<HTMLTextAreaElement>("textarea")!;
    const execute = root.querySelector<HTMLButtonElement>(".pnw-cleanup-execute")!;
    const actions: PnwCleanupDialogActionDetail[] = [];
    dialog.addEventListener(PNW_CLEANUP_DIALOG_ACTION, (event) => actions.push((event as CustomEvent<PnwCleanupDialogActionDetail>).detail));
    expect(execute.disabled).toBe(false);
    if (collapsibleSections) root.querySelector<HTMLDetailsElement>('[data-section="预览结果"] summary')!.click();
    rules.focus();
    for (const suffix of ["\n# first", "\n# second"]) {
      rules.value += suffix;
      rules.setSelectionRange(5, 9, "backward");
      rules.scrollTop = 24;
      rules.scrollLeft = 8;
      rules.dispatchEvent(new Event("input"));
      expect(root.querySelector("textarea")).toBe(rules);
      expect(root.activeElement).toBe(rules);
      expect([rules.selectionStart, rules.selectionEnd, rules.selectionDirection]).toEqual([5, 9, "backward"]);
      expect([rules.scrollTop, rules.scrollLeft]).toEqual([24, 8]);
      expect(dialog.model.rulesYaml).toBe(rules.value);
      expect(dialog.model.preview).toEqual({ state: "idle", items: [] });
      expect(execute.disabled).toBe(true);
      expect(root.textContent).not.toContain("旧匹配结果");
      expect(root.textContent).not.toContain("old/build");
      if (collapsibleSections) expect(root.querySelector<HTMLDetailsElement>('[data-section="预览结果"]')!.open).toBe(false);
    }
    expect(actions).toHaveLength(2);
    expect(actions.every(({ kind }) => kind === "change-rules")).toBe(true);
    execute.click();
    expect(actions).toHaveLength(2);
  });
});
