// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  ktCodegenDefinePrimaryPanelElement,
  type KtCodegenPrimaryPanel,
} from "../src/ui/KtCodegenPrimaryPanel.js";
import type { KtCodegenPrimaryActionDetail, KtCodegenPrimaryUiModel } from "../src/ui/KtCodegenUiContracts.js";

const model: KtCodegenPrimaryUiModel = {
  kind: "kt.codegen.primary-ui-model", schemaVersion: 1, running: false,
  documents: [{
    id: "doc", fileName: "Feature.json", displayPath: "config/Feature.json",
    itemCount: 7, className: "PNXFeatureData", namePrefix: "PNX", nameMiddle: "Feature",
    nameSpace: "Example", appendFunction: "Data", open: true, active: true, dirty: false,
    externalConflict: false, externalState: "current", diagnosticCount: 0,
  }],
  activeId: "doc",
  reports: [{ id: "report", subject: "Feature.json", startedAt: "2026-09-09T00:00:00Z",
    applyKind: "single", itemCount: 7, health: "success", change: "updated" }],
  candidates: [{ id: "source", displayPath: "src/Feature.cpp", markerCount: 2, encoding: "UTF-8", eol: "lf" }],
  reportInvalidCount: 0,
  capabilities: { openJson: true, importCsv: true, applyAll: true, scanCandidates: true, openReportDirectory: true },
};

beforeAll(() => { ktCodegenDefinePrimaryPanelElement(); });
afterEach(() => document.body.replaceChildren());

function mount(value = model) {
  const panel = document.createElement("kt-codegen-primary-panel") as KtCodegenPrimaryPanel;
  const actions: KtCodegenPrimaryActionDetail[] = [];
  document.body.addEventListener("kt-codegen-primary-action", (event) => {
    actions.push((event as CustomEvent<KtCodegenPrimaryActionDetail>).detail);
  }, { signal: controller.signal });
  panel.model = value;
  document.body.append(panel);
  const buttons = () => Array.from(panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".pnw-codegen-actions button"));
  return { panel, actions, buttons };
}

let controller = new AbortController();
afterEach(() => { controller.abort(); controller = new AbortController(); });

describe("Codegen Primary shared interaction", () => {
  it("shows the approved text actions and keeps semantic events after model replacement", () => {
    const { panel, actions, buttons } = mount();
    expect(buttons().map((button) => button.textContent)).toEqual(["打开", "导入", "全部应用", "刷新", "扫描"]);
    expect(buttons()[2]!.getAttribute("aria-label")).toBe("全部应用");
    for (const button of buttons()) button.click();
    expect(actions.map((detail) => detail.action)).toEqual(["openJson", "importCsv", "applyAll", "refresh", "scanCandidates"]);
    panel.model = { ...model, documents: [{ ...model.documents[0]!, dirty: true }] };
    expect(buttons().map((button) => button.textContent)).toEqual(["打开", "导入", "全部应用", "刷新", "扫描"]);
  });

  it.each(["discovery", "candidates"] as const)("keeps a working cancel action during %s", (operation) => {
    const { actions, buttons } = mount({ ...model, running: true, operation });
    const cancel = buttons().find((button) => button.textContent === "取消")!;
    expect(cancel.disabled).toBe(false);
    expect(buttons().filter((button) => !button.disabled)).toEqual([cancel]);
    cancel.click();
    expect(actions).toEqual([{ action: "cancelOperation" }]);
  });

  it("preserves document, report, source navigation and metadata actions", () => {
    const { panel, actions } = mount();
    const root = panel.shadowRoot!;
    const rows = root.querySelectorAll<HTMLButtonElement>(".pnw-codegen-row");
    expect(rows[0]!.title).toContain("config/Feature.json");
    expect(rows[2]!.getAttribute("aria-label")).toBe("src/Feature.cpp");
    rows.forEach((row) => row.click());
    root.querySelector<HTMLButtonElement>(".pnw-codegen-report-directory")!.click();
    const input = root.querySelector<HTMLInputElement>(".pnw-codegen-property input")!;
    input.value = "PHX";
    input.dispatchEvent(new Event("change"));
    expect(actions).toEqual([
      { action: "openDocument", id: "doc" }, { action: "openReport", id: "report" },
      { action: "openCandidate", id: "source" }, { action: "openReportDirectory" },
      { action: "updateMeta", id: "doc", field: "namePrefix", value: "PHX" },
    ]);
  });

  it("locks keyboard-reachable manager actions during batch apply and restores them afterwards", () => {
    const { panel, actions } = mount({ ...model, running: true, operation: "batch-apply", batch: { current: 1, total: 2, fileName: "Feature.json" } });
    const buttons = Array.from(panel.shadowRoot!.querySelectorAll<HTMLButtonElement>("button"));
    expect(buttons.every((button) => button.disabled)).toBe(true);
    buttons.forEach((button) => button.click());
    expect(actions).toEqual([]);
    panel.model = model;
    const row = panel.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-codegen-row")!;
    expect(row.disabled).toBe(false);
    row.click();
    expect(actions).toEqual([{ action: "openDocument", id: "doc" }]);
  });
});
