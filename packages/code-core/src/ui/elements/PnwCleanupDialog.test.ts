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
});
