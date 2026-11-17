// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { pnwCodeDefineReorderMembersPanel, PNW_CODE_REORDER_MEMBERS_PANEL_ACTION } from "./PnwCodeReorderMembersPanel.js";
import { pnwCodeDefineUuidResultsPanel, PNW_CODE_UUID_RESULTS_ACTION } from "./PnwCodeUuidResultsPanel.js";
import { pnwCodeDefineRenameResultsPanel, PNW_CODE_RENAME_RESULTS_ACTION } from "./PnwCodeRenameResultsPanel.js";
import { pnwCodeProjectRenameResults } from "./PnwCodeRenameResultsState.js";
import { pnwCodeProjectUuidFiles, type PnwCodeUuidResultHit } from "./PnwCodeUuidResultsState.js";
import type { PnwCodeReorderMembersPanelModel } from "./PnwCodeReorderMembersPanelState.js";
import type { PnwContentBlock } from "./elements/PnwContentBlock.js";

afterEach(() => document.body.replaceChildren());

const uri = "memory://sample.h";
const reorderModel = (): PnwCodeReorderMembersPanelModel => ({
  presentation: "results", status: "done", scanned: 3, reorderRevision: 7, reorderSelectedUris: [uri],
  reorderResults: [
    { uri, relativePath: "include/Sample.h", kind: "header", encoding: "UTF-8", changed: true, state: "pending", warnings: [] },
    { uri: "memory://same.cpp", relativePath: "src/Same.cpp", kind: "source", encoding: "UTF-8", changed: false, state: "unchanged", warnings: [] },
    { uri: "memory://blocked.h", relativePath: "include/Blocked.h", kind: "header", encoding: "UTF-8", changed: false, state: "blocked", warnings: ["Protected member"], reviewCandidateAvailable: true, reviewCandidateViewed: false },
  ],
});
const uuidHits = (): readonly PnwCodeUuidResultHit[] => [
  { id: "a", fileId: uri, relativePath: "include/Sample.h", line: 2, column: 3, from: "11111111-1111-1111-1111-111111111111", normalized: "11111111111111111111111111111111", kind: "uuid", to: "22222222-2222-2222-2222-222222222222" },
  { id: "b", fileId: "memory://other.h", relativePath: "include/Other.h", line: 4, column: 1, from: "11111111-1111-1111-1111-111111111111", normalized: "11111111111111111111111111111111", kind: "uuid" },
  { id: "c", fileId: "memory://blocked.h", relativePath: "include/Blocked.h", line: 6, column: 1, from: "33333333-3333-3333-3333-333333333333", normalized: "33333333333333333333333333333333", kind: "uuid", state: "blocked" },
];
function toggle(block: PnwContentBlock): void { block.shadowRoot!.querySelector<HTMLButtonElement>('button[part="toggle"]')!.click(); }
function blockTitle(block: Element): string { return block.querySelector('[slot="title"]')!.textContent!; }
function blocks(root: ShadowRoot): PnwContentBlock[] { return Array.from(root.querySelectorAll<PnwContentBlock>("pnw-content-block")); }
function mountReorder(enabled = true) {
  pnwCodeDefineReorderMembersPanel();
  const panel = document.createElement("pnw-code-reorder-members-panel"); panel.blockPresentation = enabled; panel.model = reorderModel();
  document.body.append(panel); const received = vi.fn(); panel.addEventListener(PNW_CODE_REORDER_MEMBERS_PANEL_ACTION, event => received((event as CustomEvent).detail));
  return { panel, root: panel.shadowRoot!, received };
}
function mountUuid(enabled = true) {
  pnwCodeDefineUuidResultsPanel();
  const panel = document.createElement("pnw-code-uuid-results-panel"); panel.blockPresentation = enabled;
  panel.model = { presentation: "hits", hits: uuidHits(), selectedIds: ["a"], capabilities: { selection: true, open: true, apply: true, cancel: true, gitDiff: true } };
  document.body.append(panel); const received = vi.fn(); panel.addEventListener(PNW_CODE_UUID_RESULTS_ACTION, event => received((event as CustomEvent).detail));
  return { panel, root: panel.shadowRoot!, received };
}
function mountRename(enabled = true) {
  pnwCodeDefineRenameResultsPanel();
  const panel = document.createElement("pnw-code-rename-results-panel"); panel.blockPresentation = enabled;
  panel.model = { title: "替换预览", summary: "中性结果样例", rows: pnwCodeProjectRenameResults({
    root: "/workspace/sample", applied: false,
    hits: [{ id: "rename-1", relativePath: "src/OldName.cpp", level: "text", occurrences: 2, lines: [3, 8], status: "preview", matches: [{ search: "OldName", replace: "NewName" }] }],
  }), capabilities: { open: true } };
  document.body.append(panel); const received = vi.fn(); panel.addEventListener(PNW_CODE_RENAME_RESULTS_ACTION, event => received((event as CustomEvent).detail));
  return { panel, root: panel.shadowRoot!, received };
}

describe("explicit opt-in result Content Blocks", () => {
  it("keeps all existing consumers on legacy presentation unless explicitly enabled", () => {
    const contexts = [mountReorder(false), mountUuid(false), mountRename(false)];
    for (const context of contexts) {
      expect(context.panel.blockPresentation).toBe(false);
      expect(context.root.querySelector("pnw-content-block")).toBeNull();
      expect(context.panel.hasAttribute("block-presentation")).toBe(false);
      expect(context.received).not.toHaveBeenCalled();
    }
    expect(contexts[0]!.root.querySelector(".group-header")).not.toBeNull();
    expect(contexts[1]!.root.querySelector(".group-head")).not.toBeNull();
    expect(contexts[2]!.root.querySelector(".head")).not.toBeNull();
  });

  it("renders shared primary/secondary reorder Blocks and keeps selection outside the disclosure button", () => {
    const { root, received } = mountReorder();
    const values = blocks(root);
    expect(values.map(blockTitle)).toEqual(["排序结果", "变更文件 · 1 个", "无变更文件 · 1 个", "错误 / 已阻止 · 1 个"]);
    expect(values.map(value => value.level)).toEqual(["primary", "secondary", "secondary", "secondary"]);
    expect(values[0]!.collapsible).toBe(false); expect(values.slice(1).every(value => value.open && value.collapsible)).toBe(true);
    const all = root.querySelector<HTMLInputElement>('input[aria-label="选择全部待写盘文件"]')!;
    expect(all.slot).toBe("actions"); expect(all.parentElement).toBe(values[1]);
    all.click(); expect(values[1]!.open).toBe(true);
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderSelection", uris: [], reorderRevision: 7 });
    expect(root.querySelectorAll(".file-row")).toHaveLength(3);
    expect(root.querySelector(".group-header")).toBeNull();
  });

  it("retains secondary reorder expansion through filters, selection and model refresh without business events", () => {
    const { panel, root, received } = mountReorder();
    toggle(blocks(root)[1]!); expect(blocks(root)[1]!.open).toBe(false); expect(received).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('[data-filter="error"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(blocks(root)[1]!.open).toBe(false); expect(received).not.toHaveBeenCalled();
    panel.model = { ...panel.model!, message: "Updated status" };
    expect(blocks(root)[1]!.open).toBe(false);
    root.querySelector<HTMLInputElement>('input[aria-label="选择 include/Sample.h"]')!.click();
    expect(blocks(root)[1]!.open).toBe(false);
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderSelection", uris: [], reorderRevision: 7 });
    panel.blockPresentation = false; expect(root.querySelector("pnw-content-block")).toBeNull();
    panel.blockPresentation = true; expect(blocks(root)[1]!.open).toBe(false);
    expect(root.querySelector<HTMLInputElement>('input[aria-label="选择 include/Sample.h"]')!.checked).toBe(false);
  });

  it("preserves rendered revision rejection, reviewed-candidate safety and capability/running locks in reorder Blocks", () => {
    const { panel, root, received } = mountReorder();
    const oldApply = root.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!;
    const oldSelection = root.querySelector<HTMLInputElement>('input[aria-label="选择全部待写盘文件"]')!;
    expect(root.querySelector<HTMLButtonElement>('button[title="先查看候选差异，再单独确认应用"]')!.disabled).toBe(true);
    panel.model = { ...panel.model!, reorderRevision: 8, reorderSelectedUris: [] };
    oldApply.click(); oldSelection.checked = true; oldSelection.dispatchEvent(new Event("change"));
    expect(received).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('button[title="应用此文件"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "reorderAction", action: "apply", uris: [uri], reorderRevision: 8 });
    received.mockClear(); panel.model = { ...panel.model!, status: "running" };
    expect(Array.from(root.querySelectorAll<HTMLInputElement>("input")).every(value => value.disabled)).toBe(true);
    expect(root.querySelector(".inline button")).toBeNull();
    panel.model = { ...panel.model!, status: "done", capabilities: { selection: false, apply: false, open: false, preview: false } };
    expect(root.querySelector("input")).toBeNull(); expect(root.querySelector('button[title="应用此文件"]')).toBeNull();
    root.querySelector<HTMLElement>(".file-main")!.click(); expect(received).not.toHaveBeenCalled();
  });

  it("keeps execution separate from results in ribbon/detail presentations and does not create nested scroll owners", () => {
    const { panel, root, received } = mountReorder();
    panel.model = { ...panel.model!, presentation: "detailBlock" };
    expect(blocks(root).filter(value => value.level === "primary").map(blockTitle)).toEqual(["执行", "排序结果"]);
    expect(root.querySelector(".actions")?.textContent).toContain("扫描");
    const scan = Array.from(root.querySelectorAll<HTMLButtonElement>(".actions button")).find(value => value.textContent === "扫描")!;
    scan.click(); expect(received).toHaveBeenLastCalledWith({ kind: "run", action: "preview" });
    expect(root.querySelector("style")!.textContent).toContain(":host([block-presentation]) .groups { max-height:none; margin:0; overflow:visible; }");
  });

  it("uses primary UUID results and secondary same-value Blocks with identity/context, counts/status and selection/actions slots", () => {
    const { root, received } = mountUuid();
    const values = blocks(root);
    expect(values.map(blockTitle)).toEqual(["UUID 扫描结果", "同值组 1", "同值组 2"]);
    expect(values.map(value => value.level)).toEqual(["primary", "secondary", "secondary"]);
    expect(values[1]!.querySelector('[slot="context"]')?.textContent).toBe("11111111-1111-1111-1111-111111111111");
    expect(values[1]!.querySelector('[slot="status"]')?.textContent).toBe("2 处");
    const all = values[1]!.querySelector<HTMLInputElement>('input[slot="actions"]')!;
    expect(all.indeterminate).toBe(true); all.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "selection", scope: "hit", ids: ["a", "b"] });
    expect(blocks(root)[1]!.open).toBe(true);
    expect(root.querySelector(".group-head")).toBeNull(); expect(root.querySelectorAll(".row")).toHaveLength(3);
  });

  it("retains UUID group expansion without selection or Host events and preserves explicit Host selection on refresh", () => {
    const { panel, root, received } = mountUuid();
    toggle(blocks(root)[1]!); expect(blocks(root)[1]!.open).toBe(false); expect(received).not.toHaveBeenCalled();
    panel.model = { ...panel.model!, selectedIds: ["b"] };
    expect(blocks(root)[1]!.open).toBe(false); expect(blocks(root)[2]!.open).toBe(true);
    const choices = Array.from(root.querySelectorAll<HTMLInputElement>(".row input"));
    expect(choices.map(value => value.checked)).toEqual([true, false, false]);
    panel.blockPresentation = false; panel.blockPresentation = true;
    expect(blocks(root)[1]!.open).toBe(false); expect(received).not.toHaveBeenCalled();
    panel.model = { ...panel.model!, running: true };
    expect(Array.from(root.querySelectorAll<HTMLInputElement>("input")).every(value => value.disabled)).toBe(true);
    expect(root.querySelector('.actions button[title="应用"]')).toBeNull();
  });

  it("keeps UUID file grouping and native action payloads while capability-disabled actions stay absent", () => {
    const { panel, root, received } = mountUuid();
    panel.model = { ...panel.model!, presentation: "files", files: pnwCodeProjectUuidFiles([{ uri, relativePath: "include/Sample.h", encoding: "UTF-8" }], uuidHits()), selectedIds: [uri] };
    expect(blocks(root).map(blockTitle)).toEqual(["UUID 扫描结果", "命中文件"]);
    root.querySelector<HTMLButtonElement>('button[title="应用"]')!.click();
    expect(received).toHaveBeenLastCalledWith({ kind: "action", scope: "file", action: "apply", ids: [uri] });
    panel.model = { ...panel.model!, capabilities: {} }; received.mockClear();
    expect(root.querySelector("input,.actions button")).toBeNull();
    root.querySelector<HTMLElement>(".main")!.click(); expect(received).not.toHaveBeenCalled();
  });

  it("projects the existing rename heading into one primary Block without regrouping or changing highlight/open payloads", () => {
    const { panel, root, received } = mountRename();
    const [block] = blocks(root);
    expect(blockTitle(block!)).toBe("替换预览"); expect(block!.level).toBe("primary"); expect(block!.collapsible).toBe(false);
    expect(block!.querySelector('[slot="status"]')?.textContent).toBe("1 项");
    expect(root.querySelector(".pnw-results-summary")?.textContent).toBe("中性结果样例");
    expect(root.querySelector("mark")?.textContent).toBe("OldName");
    expect(root.querySelectorAll(".row")).toHaveLength(1); expect(root.querySelector(".head")).toBeNull();
    root.querySelector<HTMLButtonElement>('button[title="打开并定位"]')!.click();
    const row = panel.model!.rows[0]!;
    expect(received).toHaveBeenLastCalledWith({ kind: "open", id: row.id, path: row.openPath, line: row.openLine });
    panel.blockPresentation = false; expect(root.querySelector(".head")).not.toBeNull(); expect(root.querySelectorAll("mark")).toHaveLength(1);
    panel.blockPresentation = true; expect(blocks(root)).toHaveLength(1); expect(root.querySelectorAll(".row")).toHaveLength(1);
  });

  it("retains rename running/capability locks and all empty result messages without fabricated business actions", () => {
    const { panel, root, received } = mountRename();
    panel.model = { ...panel.model!, running: true };
    expect(root.querySelector(".actions button")).toBeNull(); root.querySelector<HTMLElement>(".main")!.click(); expect(received).not.toHaveBeenCalled();
    panel.model = { ...panel.model!, running: false, capabilities: { open: false } };
    expect(root.querySelector(".actions button")).toBeNull();
    panel.model = { rows: [], emptyMessage: "Empty rename sample" };
    expect(root.querySelector(".empty")?.textContent).toBe("Empty rename sample");
    const uuid = mountUuid(); uuid.panel.model = { presentation: "hits", hits: [], emptyMessage: "Empty UUID sample" };
    expect(uuid.root.querySelector(".empty")?.textContent).toBe("Empty UUID sample");
    expect(blocks(uuid.root)).toHaveLength(1); expect(uuid.received).not.toHaveBeenCalled();
  });
});
