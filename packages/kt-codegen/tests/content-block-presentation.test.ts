// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PNW_CONTENT_BLOCK_TOGGLE, type PnwContentBlock } from "@phoenix-wing/code-core/ui";
import type { KtCodegenPlan } from "../src/api/contracts.js";
import { ktCodegenDefinePrimaryPanelElement, type KtCodegenPrimaryPanel } from "../src/ui/KtCodegenPrimaryPanel.js";
import { ktCodegenDefineControlPanelElement, type KtCodegenControlPanel } from "../src/ui/KtCodegenControlPanel.js";
import { ktCodegenDefineControlCatalogElement, type KtCodegenControlCatalog } from "../src/ui/KtCodegenControlCatalog.js";
import { ktCodegenDefineApplyReportElements, type KtCodegenApplyReport, type KtCodegenApplyReportSummary } from "../src/ui/KtCodegenApplyReport.js";
import { ktCodegenBuildApplyReport, type KtCodegenApplyReportItem } from "../src/ui/KtCodegenApplyReportModel.js";
import type { KtCodegenControlUiModel, KtCodegenPrimaryUiModel } from "../src/ui/KtCodegenUiContracts.js";
import { KtCodegenItem } from "../src/KtCodegenItem.js";
import { ktCodegenDefineTableElement } from "../src/table/KtCodegenTable.js";

beforeAll(() => {
  // Happy DOM 15 does not implement the browser's legacy Option constructor.
  vi.stubGlobal("Option", function(text: string, value = text): HTMLOptionElement {
    const option = document.createElement("option"); option.text = text; option.value = value; return option;
  });
  ktCodegenDefinePrimaryPanelElement(); ktCodegenDefineControlPanelElement(); ktCodegenDefineControlCatalogElement(); ktCodegenDefineApplyReportElements(); ktCodegenDefineTableElement();
});
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  // Happy DOM retains detached focused descendants unless focus is explicitly returned first.
  document.body.tabIndex = -1; document.body.focus(); document.body.replaceChildren();
});

function controlModel(preflight = false): KtCodegenControlUiModel {
  const model: KtCodegenControlUiModel = {
    kind: "kt.codegen.control-ui-model", schemaVersion: 1, documentId: "doc", fileName: "Sample.json",
    selectedBlockKeys: ["PARAM CONSTRUCTOR", "PARAM DECLARATION"],
    blocks: [{ key: "PARAM CONSTRUCTOR", status: "hit", hitCount: 1, artifactCount: 0 }, { key: "PARAM DECLARATION", status: "pending", hitCount: 0, artifactCount: 0 }], unclosed: [],
  };
  if (!preflight) return model;
  const plan = {
    kind: "kt.codegen.plan", schemaVersion: 1, phase: "preview", targets: [], blockKeys: ["PARAM CONSTRUCTOR"], artifacts: [],
    markerRegions: [{ id: "region", path: "src/Sample.cpp", classId: "Sample", nameSuffix: "Sample", sourceFingerprint: "before", blockKey: "PARAM CONSTRUCTOR", start: { line: 1 }, end: { line: 2 } }],
    diagnostics: [{ code: "sample.warning", severity: "warning", message: "Sample warning", path: { source: "source", file: "src/Sample.cpp", row: 7 } }],
    hasChanges: false, canApply: false,
  } as unknown as KtCodegenPlan;
  return { ...model, preflight: { plan, reused: false, createdAt: "now", state: "ready", message: "ready" } };
}
function primaryModel(): KtCodegenPrimaryUiModel {
  return {
    kind: "kt.codegen.primary-ui-model", schemaVersion: 1, running: false, activeId: "doc", controls: controlModel(),
    documents: [{ id: "doc", fileName: "Sample.json", displayPath: "config/Sample.json", itemCount: 2, className: "Sample", namePrefix: "S", nameMiddle: "ample", nameSpace: "Example", appendFunction: "Data", open: true, active: true, dirty: false, externalConflict: false, externalState: "current", diagnosticCount: 0 }],
    reports: [{ id: "report", subject: "Sample.json", startedAt: "2026-09-01T00:00:00Z", applyKind: "single", itemCount: 1, health: "success", change: "updated" }],
    candidates: [{ id: "candidate", displayPath: "src/Sample.cpp", markerCount: 1, encoding: "UTF-8", eol: "lf" }], reportInvalidCount: 0,
    capabilities: { openJson: true, importCsv: true, applyAll: true, scanCandidates: true, openReportDirectory: true, outputControlTemplates: true },
  };
}
function reportItem(id: string, health: KtCodegenApplyReportItem["health"] = "success"): KtCodegenApplyReportItem {
  return { documentId: id, fileName: `${id}.json`, displayPath: `config/${id}.json`, health, change: health === "error" ? "not-applied" : "updated", reasonCode: "sample", errorCount: health === "error" ? 1 : 0,
    preflightRegionCount: 1, preflightArtifactCount: 1, preflightDiagnosticCount: health === "error" ? 1 : 0, preflightErrorCount: health === "error" ? 1 : 0,
    modifiedFileCount: health === "error" ? 0 : 1, writtenRegionCount: health === "error" ? 0 : 1, elapsedMilliseconds: 10,
    issues: health === "error" ? [{ severity: "error", code: "sample.issue", message: "Sample issue", path: "src/Other.cpp", line: 8 }] : [] };
}
function reportModel() { return ktCodegenBuildApplyReport({ reportId: "report", applyKind: "batch", startedAt: "start", finishedAt: "end", elapsedMilliseconds: 20, items: [reportItem("Sample"), reportItem("Other", "error")] }); }
function toggle(block: PnwContentBlock): void { block.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle"]')!.click(); }

describe("Codegen opt-in shared content Blocks", () => {
  it("keeps the established legacy presentation as the default for all four public UI elements", () => {
    const primary = document.createElement("kt-codegen-primary-panel"); primary.model = primaryModel();
    const control = document.createElement("kt-codegen-control-panel"); control.model = controlModel(true);
    const catalog = document.createElement("kt-codegen-control-catalog"); catalog.model = controlModel();
    const report = document.createElement("kt-codegen-apply-report"); report.model = reportModel();
    for (const view of [primary, control, catalog, report]) {
      document.body.append(view); expect(view.blockPresentation).toBe(false); expect(view.shadowRoot!.querySelector("pnw-content-block")).toBeNull();
    }
  });

  it("uses public first-level Primary Blocks, secondary catalog groups and unchanged semantic actions", () => {
    const panel = document.createElement("kt-codegen-primary-panel"); panel.blockPresentation = true; panel.model = primaryModel(); document.body.append(panel);
    const root = panel.shadowRoot!, blocks = Array.from(root.querySelectorAll<PnwContentBlock>("pnw-content-block"));
    expect(blocks.map((block) => block.dataset.codegenBlockKey)).toEqual(["current", "documents", "reports", "controls", "candidates"]);
    expect(blocks.every((block) => block.level === "primary")).toBe(true);
    expect(root.querySelector("details,summary")).toBeNull();
    const catalog = root.querySelector<KtCodegenControlCatalog>("kt-codegen-control-catalog")!;
    expect(catalog.blockPresentation).toBe(true);
    expect(Array.from(catalog.shadowRoot!.querySelectorAll<PnwContentBlock>("pnw-content-block")).every((block) => block.level === "secondary")).toBe(true);
    const seen = vi.fn(); panel.addEventListener("kt-codegen-primary-action", seen);
    root.querySelectorAll<HTMLButtonElement>(".pnw-codegen-row").forEach((row) => row.click());
    root.querySelector<HTMLButtonElement>(".pnw-codegen-report-directory")!.click();
    expect(seen.mock.calls.map(([event]) => event.detail)).toEqual([{ action: "openDocument", id: "doc" }, { action: "openReport", id: "report" }, { action: "openCandidate", id: "candidate" }, { action: "openReportDirectory" }]);
    toggle(blocks[1]!); expect(blocks[1]!.open).toBe(false);
    panel.model = { ...primaryModel(), reportInvalidCount: 1 };
    expect(root.querySelector('[data-codegen-block-key="documents"]')).toBe(blocks[1]); expect(blocks[1]!.open).toBe(false);
  });

  it("preserves the focused metadata input and its unsaved text through routine snapshots, then gates it during work", () => {
    const panel = document.createElement("kt-codegen-primary-panel"); panel.blockPresentation = true; panel.model = primaryModel(); document.body.append(panel);
    const input = panel.shadowRoot!.querySelector<HTMLInputElement>(".pnw-codegen-property input")!, seen = vi.fn();
    panel.addEventListener("kt-codegen-primary-action", seen);
    input.focus(); input.value = "Draft"; input.setSelectionRange(1, 3);
    panel.model = { ...primaryModel(), documents: [{ ...primaryModel().documents[0]!, dirty: true }] };
    expect(panel.shadowRoot!.querySelector(".pnw-codegen-property input")).toBe(input);
    expect(panel.shadowRoot!.activeElement).toBe(input); expect(input.value).toBe("Draft"); expect(input.selectionStart).toBe(1); expect(input.selectionEnd).toBe(3);
    input.dispatchEvent(new Event("change"));
    expect(seen.mock.calls[0]![0].detail).toEqual({ action: "updateMeta", id: "doc", field: "namePrefix", value: "Draft" });
    panel.model = { ...primaryModel(), running: true, operation: "batch-apply", batch: { current: 1, total: 2, fileName: "Sample.json" } };
    expect(input.disabled).toBe(true);
    const buttons = Array.from(panel.shadowRoot!.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons.every((button) => button.disabled)).toBe(true);
    buttons.forEach((button) => button.click()); expect(seen).toHaveBeenCalledOnce();
  });

  it("uses the same disclosure truth when switching between legacy and shared Primary/catalog presentations", () => {
    const panel = document.createElement("kt-codegen-primary-panel"); panel.blockPresentation = true; panel.model = primaryModel(); document.body.append(panel);
    const documents = panel.shadowRoot!.querySelector<PnwContentBlock>('[data-codegen-block-key="documents"]')!;
    panel.blockPresentation = false;
    const native = panel.shadowRoot!.querySelector<HTMLDetailsElement>('[data-codegen-block-key="documents"]')!;
    native.open = false; native.dispatchEvent(new Event("toggle"));
    panel.blockPresentation = true;
    expect(panel.shadowRoot!.querySelector('[data-codegen-block-key="documents"]')).toBe(documents); expect(documents.open).toBe(false);
    const catalog = document.createElement("kt-codegen-control-catalog"); catalog.blockPresentation = true; catalog.model = controlModel(); document.body.append(catalog);
    const group = catalog.shadowRoot!.querySelector<PnwContentBlock>("pnw-content-block")!;
    catalog.blockPresentation = false;
    const nativeGroup = catalog.shadowRoot!.querySelector<HTMLDetailsElement>("details")!;
    nativeGroup.open = false; nativeGroup.dispatchEvent(new Event("toggle"));
    catalog.blockPresentation = true;
    expect(catalog.shadowRoot!.querySelector("pnw-content-block")).toBe(group); expect(group.open).toBe(false);
  });

  it("keeps ControlPanel filters/cache/status on public slots and original business controls across folding and refresh", () => {
    const panel = document.createElement("kt-codegen-control-panel"); panel.blockPresentation = true; panel.collapsible = true; panel.model = controlModel(true); document.body.append(panel);
    const root = panel.shadowRoot!, block = root.querySelector<PnwContentBlock>("pnw-content-block")!, path = root.querySelector<HTMLInputElement>(".pnw-codegen-path-toggle input")!;
    const body = root.querySelector<HTMLElement>("#pnw-codegen-control-body")!, events = vi.fn();
    panel.addEventListener("kt-codegen-control-collapse-change", events);
    expect(block.querySelector('[slot="title"]')!.textContent).toBe("预检结果"); expect(block.querySelector('[slot="status"]')!.textContent).toBe("新计划");
    expect(root.querySelector(".pnw-codegen-collapse,[data-codegen-block-indicator]")).toBeNull();
    path.focus(); path.click();
    expect(root.querySelector(".pnw-codegen-path-toggle input")).toBe(path); expect(path.checked).toBe(true); expect(root.activeElement).toBe(path);
    const currentBody = root.querySelector<HTMLElement>("#pnw-codegen-control-body")!;
    toggle(block); expect(panel.collapsed).toBe(true); expect(block.open).toBe(false);
    expect(root.querySelector("#pnw-codegen-control-body")).toBe(currentBody); expect(currentBody.hidden).toBe(false);
    toggle(block); expect(events.mock.calls.map(([event]) => event.detail)).toEqual([{ collapsed: true }, { collapsed: false }]);
    const stale = controlModel(true); panel.model = { ...stale, preflight: { ...stale.preflight!, state: "stale", message: "revision changed" } };
    expect(root.querySelector(".pnw-codegen-path-toggle input")).toBe(path); expect(path.checked).toBe(true);
    expect(block.querySelector('[slot="status"]')!.textContent).toContain("已过期");
    expect(block.querySelector('[role="status"]')!.textContent).toContain("revision changed");
    expect(body).not.toBeNull();
  });

  it("does not turn filter/label actions or bubbled nested Block events into outer collapse events", () => {
    const panel = document.createElement("kt-codegen-control-panel"); panel.blockPresentation = true; panel.collapsible = true; panel.model = controlModel(true); document.body.append(panel);
    const root = panel.shadowRoot!, block = root.querySelector<PnwContentBlock>("pnw-content-block")!, events = vi.fn();
    panel.addEventListener("kt-codegen-control-collapse-change", events);
    root.querySelector<HTMLButtonElement>(".pnw-codegen-filter")!.click(); root.querySelector<HTMLLabelElement>(".pnw-codegen-path-toggle")!.click();
    const child = document.createElement("pnw-content-block"); block.querySelector('[slot="body"]')!.append(child);
    child.dispatchEvent(new CustomEvent(PNW_CONTENT_BLOCK_TOGGLE, { bubbles: true, composed: true, detail: { expanded: false } }));
    expect(panel.collapsed).toBe(false); expect(events).not.toHaveBeenCalled();
    panel.collapsed = true; expect(block.open).toBe(false); expect(events).not.toHaveBeenCalled();
    panel.collapsible = false; expect(block.collapsible).toBe(false);
    panel.collapsible = true; expect(block.open).toBe(false);
  });

  it("keeps catalog group selection independent of disclosure and patches selected rows without replacing controls", () => {
    const catalog = document.createElement("kt-codegen-control-catalog"); catalog.blockPresentation = true; catalog.outputEnabled = true; catalog.model = controlModel(); document.body.append(catalog);
    const root = catalog.shadowRoot!, block = root.querySelector<PnwContentBlock>("pnw-content-block")!, selection = vi.fn(), output = vi.fn();
    catalog.addEventListener("kt-codegen-control-selection-change", selection); catalog.addEventListener("kt-codegen-control-output", output);
    const check = block.querySelector<HTMLInputElement>('input[slot="actions"]')!;
    check.click(); expect(block.open).toBe(true); expect(selection).toHaveBeenCalledOnce();
    expect(selection.mock.calls[0]![0].detail).toHaveProperty("blockKeys");
    const row = root.querySelector<HTMLInputElement>(".pnw-codegen-catalog-row input")!;
    row.focus(); row.click(); expect(root.querySelector(".pnw-codegen-catalog-row input")).toBe(row); expect(root.activeElement).toBe(row);
    toggle(block); expect(block.open).toBe(false);
    catalog.model = { ...controlModel(), selectedBlockKeys: [] };
    expect(root.querySelector("pnw-content-block")).toBe(block); expect(block.open).toBe(false);
    root.querySelector<HTMLButtonElement>(".pnw-codegen-output-visible")!.click();
    expect(output.mock.calls[0]![0].detail).toHaveProperty("scope", "visible");
    catalog.disabled = true;
    expect(Array.from(root.querySelectorAll<HTMLInputElement>("input")).every((input) => input.disabled)).toBe(true);
    expect(root.querySelector<HTMLButtonElement>(".pnw-codegen-output-visible")!.disabled).toBe(true);
  });

  it("renders report sections as static first-level Blocks and preserves original document/issue navigation", () => {
    const report = document.createElement("kt-codegen-apply-report"); report.blockPresentation = true; report.model = reportModel(); document.body.append(report);
    const root = report.shadowRoot!, blocks = Array.from(root.querySelectorAll<PnwContentBlock>("pnw-content-block")), seen = vi.fn();
    report.addEventListener("kt-codegen-apply-report-action", seen);
    expect(blocks.map((block) => block.querySelector('[slot="title"]')!.textContent)).toEqual(["运行明细", "问题列表"]);
    expect(blocks.every((block) => block.level === "primary" && !block.collapsible)).toBe(true);
    expect(root.querySelector("h2")).toBeNull();
    blocks[0]!.querySelector<HTMLButtonElement>(".document-link")!.click(); blocks[1]!.querySelector<HTMLButtonElement>(".issue-link")!.click();
    expect(seen.mock.calls.map(([event]) => event.detail)).toEqual([{ action: "openDocument", documentId: "Sample" }, { action: "openIssue", documentId: "Other", path: "src/Other.cpp", line: 8 }]);
    report.model = reportModel(); expect(root.querySelector("pnw-content-block")).toBe(blocks[0]);
  });

  it("retains report filter checkboxes and combo focus while filtering the existing report model", () => {
    const report = document.createElement("kt-codegen-apply-report"); report.blockPresentation = true; report.model = reportModel(); document.body.append(report);
    const root = report.shadowRoot!, summary = root.querySelector<KtCodegenApplyReportSummary>("kt-codegen-apply-report-summary")!;
    const normal = summary.shadowRoot!.querySelector<HTMLInputElement>('input[aria-label="筛选正常"]')!;
    normal.focus(); normal.click();
    expect(summary.shadowRoot!.querySelector('input[aria-label="筛选正常"]')).toBe(normal); expect(summary.shadowRoot!.activeElement).toBe(normal);
    expect(root.querySelectorAll("pnw-content-block")[0]!.querySelectorAll("tbody tr")).toHaveLength(1);
    const select = root.querySelector<HTMLSelectElement>('select[aria-label="筛选报告中的 JSON"]')!;
    select.focus(); select.value = "Sample"; select.dispatchEvent(new Event("change"));
    expect(root.querySelector("select")).toBe(select); expect(root.activeElement).toBe(select);
    expect(select.value).toBe("Sample");
    expect(root.querySelectorAll("pnw-content-block")[0]!.querySelector(".document-link")!.textContent).toBe("Sample.json");
    report.model = { ...reportModel(), items: [reportItem("Other", "error")] };
    expect(root.querySelector(".single-document")!.textContent).toContain("Other.json");
  });

  it("keeps public UI changes isolated from generation, Host services and component-private Shadow DOM", () => {
    const sources = ["KtCodegenPrimaryPanel", "KtCodegenControlPanel", "KtCodegenControlCatalog", "KtCodegenApplyReport"]
      .map((name) => readFileSync(resolve(process.cwd(), `src/ui/${name}.ts`), "utf8")).join("\n");
    expect(sources).toContain('from "@phoenix-wing/code-core/ui"');
    expect(sources).not.toMatch(/\.shadowRoot|acquireVsCodeApi|postMessage|\b(?:fetch|exec|spawn|writeFile|readFile)\s*\(/u);
    expect(sources).not.toMatch(/from ["'](?:vue|vscode|electron|node:fs|.*renderers\/|.*markers\/|.*parser\/)/u);
  });

  it("moves the existing parameter table into shared slots without replacing edited cells or changing its revision", () => {
    const table = document.createElement("kt-codegen-table");
    table.layout = "page"; table.collapsible = true;
    table.setData({ kind: "kt.codegen.table-data", schemaVersion: 1, documentRevision: 5, selectedRow: 0, items: [new KtCodegenItem({ name: "Sample" })] });
    document.body.append(table);
    const root = table.shadowRoot!, input = root.querySelector<HTMLInputElement>('input[aria-label="Title，第 1 行"]')!, changed = vi.fn(), dirty = vi.fn();
    table.addEventListener("kt-codegen-table-change", changed); table.addEventListener("kt-codegen-table-dirty-change", dirty);
    const snapshot = table.getData(); input.focus(); input.setSelectionRange(1, 3);
    expect(table.blockPresentation).toBe(false); table.blockPresentation = true;
    const block = root.querySelector<PnwContentBlock>("pnw-content-block")!;
    expect(block.querySelector('[slot="title"]')!.textContent).toBe("参数表"); expect(block.collapsible).toBe(true);
    expect(block.querySelectorAll('[slot="actions"] button[data-action]')).toHaveLength(9);
    expect(root.querySelector('input[aria-label="Title，第 1 行"]')).toBe(input);
    expect(root.activeElement).toBe(input); expect(input.selectionStart).toBe(1); expect(input.selectionEnd).toBe(3);
    table.blockPresentation = false; table.blockPresentation = true;
    expect(root.querySelector("pnw-content-block")).toBe(block); expect(root.querySelector('input[aria-label="Title，第 1 行"]')).toBe(input);
    expect(root.activeElement).toBe(input); expect(table.getData()).toEqual(snapshot);
    expect(changed).not.toHaveBeenCalled(); expect(dirty).not.toHaveBeenCalled();
  });

  it("keeps table collapse presentation-only, moves hidden editing focus through the public API and ignores nested toggles", () => {
    const table = document.createElement("kt-codegen-table"); table.blockPresentation = true; table.collapsible = true;
    table.setData({ kind: "kt.codegen.table-data", schemaVersion: 1, documentRevision: 2, selectedRow: 0, items: [new KtCodegenItem({ name: "Sample" })] });
    document.body.append(table);
    const root = table.shadowRoot!, input = root.querySelector<HTMLInputElement>('input[aria-label="Title，第 1 行"]')!, block = root.querySelector<PnwContentBlock>("pnw-content-block")!;
    const folded = vi.fn(), changed = vi.fn(), snapshot = table.getData();
    table.addEventListener("kt-codegen-table-collapse-change", folded); table.addEventListener("kt-codegen-table-change", changed);
    input.focus(); table.collapsed = true;
    expect(root.activeElement).toBe(block); expect(block.shadowRoot!.activeElement).toBe(block.shadowRoot!.querySelector('[part="toggle"]'));
    expect(root.querySelector('input[aria-label="Title，第 1 行"]')).toBe(input); expect(block.open).toBe(false);
    expect(folded).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
    toggle(block); expect(table.collapsed).toBe(false); expect(folded.mock.calls[0]![0].detail).toEqual({ collapsed: false });
    const child = document.createElement("pnw-content-block"); block.querySelector('[slot="body"]')!.append(child);
    child.dispatchEvent(new CustomEvent(PNW_CONTENT_BLOCK_TOGGLE, { bubbles: true, composed: true, detail: { expanded: false } }));
    expect(table.collapsed).toBe(false); expect(folded).toHaveBeenCalledOnce(); expect(table.getData()).toEqual(snapshot);
    table.collapsed = true; table.collapsible = false;
    expect(block.collapsible).toBe(false); expect(root.querySelector<HTMLElement>('[data-role="table-shell"]')!.hidden).toBe(false);
    input.focus(); table.collapsible = true; expect(root.activeElement).toBe(block);
    expect(table.getData()).toEqual(snapshot);
  });

  it("preserves newer table edits and focus when an older save snapshot returns in shared presentation", () => {
    const table = document.createElement("kt-codegen-table"); table.blockPresentation = true;
    table.setData({ kind: "kt.codegen.table-data", schemaVersion: 1, documentRevision: 0, selectedRow: 0, items: [new KtCodegenItem({ name: "Saved" })] });
    document.body.append(table);
    const root = table.shadowRoot!, input = root.querySelector<HTMLInputElement>('input[aria-label="Title，第 1 行"]')!, saved = table.getData(), changed = vi.fn(), dirty = vi.fn();
    table.addEventListener("kt-codegen-table-change", changed); table.addEventListener("kt-codegen-table-dirty-change", dirty);
    input.focus(); input.value = "Newer"; input.dispatchEvent(new Event("input"));
    // Document revision is Host-owned; local cell changes keep the preceding snapshot revision.
    expect(table.getData().documentRevision).toBe(0); expect(table.getData().items[0]!.name).toBe("Newer");
    expect(changed.mock.calls[0]![0].detail).toEqual({ documentRevision: 0, itemCount: 1 }); expect(dirty.mock.calls[0]![0].detail.dirty).toBe(true);
    table.markCheckpoint(1, saved.items);
    expect(root.querySelector('input[aria-label="Title，第 1 行"]')).toBe(input); expect(root.activeElement).toBe(input);
    expect(table.getData().items[0]!.name).toBe("Newer"); expect(root.querySelector('[data-role="status"]')!.textContent).toContain("未保存");
    table.setStatus("error", "样例状态回执"); expect(table.getData().documentRevision).toBe(1);
    expect(root.querySelector('[data-role="status"]')!.textContent).toBe("样例状态回执");
    const source = readFileSync(resolve(process.cwd(), "src/table/KtCodegenTable.ts"), "utf8");
    expect(source).not.toContain(".shadowRoot"); expect(source).toContain("this.contentBlock.focusHeader");
    const style = readFileSync(resolve(process.cwd(), "src/table/KtCodegenTableStyle.ts"), "utf8");
    expect(style).toContain("pnw-content-block::part(block)"); expect(style).toContain("pnw-content-block::part(body)");
  });
});
