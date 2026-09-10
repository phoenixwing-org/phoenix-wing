// @vitest-environment happy-dom
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { KtCodegenPlan } from "../src/api/contracts.js";
import {
  KT_CODEGEN_CONTROL_COLLAPSE_CHANGE,
  ktCodegenDefineControlPanelElement,
  type KtCodegenControlCollapseChangeDetail,
  type KtCodegenControlPanel,
} from "../src/ui/KtCodegenControlPanel.js";
import type { KtCodegenControlUiModel } from "../src/ui/KtCodegenUiContracts.js";

beforeAll(() => { ktCodegenDefineControlPanelElement(); });
afterEach(() => document.body.replaceChildren());

function model(): KtCodegenControlUiModel {
  const plan = {
    kind: "kt.codegen.plan",
    schemaVersion: 1,
    phase: "preview",
    targets: [],
    blockKeys: ["PARAM EQUAL"],
    artifacts: [],
    markerRegions: [{
      id: "region-1", path: "src/a.cpp", sourceFingerprint: "before", classId: "Sample",
      nameSuffix: "Sample", blockKey: "PARAM EQUAL", start: { line: 1 }, end: { line: 2 },
    }],
    diagnostics: [{
      code: "marker.missing-end", severity: "error", message: "missing END",
      path: { source: "source", file: "src/a.cpp", row: 7 },
      marker: { kind: "start", classId: "Sample", blockKey: "PARAM EQUAL" },
    }],
    hasChanges: false,
    canApply: false,
  } as unknown as KtCodegenPlan;
  return {
    kind: "kt.codegen.control-ui-model",
    schemaVersion: 1,
    documentId: "doc-1",
    fileName: "sample.json",
    selectedBlockKeys: ["PARAM EQUAL"],
    blocks: [{ key: "PARAM EQUAL", status: "unclosed", hitCount: 1, artifactCount: 0 }],
    unclosed: [{
      code: "marker.missing-end", path: "src/a.cpp", line: 7, blockKey: "PARAM EQUAL",
      expectedEnd: "// END KEVIN CAA WIZARD SECTION Sample PARAM EQUAL",
    }],
    preflight: { plan, reused: false, createdAt: "now", state: "ready", message: "ready" },
  };
}

function mount(value?: KtCodegenControlUiModel): KtCodegenControlPanel {
  const panel = document.createElement("kt-codegen-control-panel") as KtCodegenControlPanel;
  if (value) panel.model = value;
  document.body.append(panel);
  return panel;
}

describe("Codegen preflight control panel collapse", () => {
  it("keeps existing consumers expanded unless collapsible is explicitly enabled", () => {
    const panel = mount();
    const body = () => panel.shadowRoot!.querySelector<HTMLElement>("#pnw-codegen-control-body")!;
    expect(panel.collapsible).toBe(false);
    expect(panel.collapsed).toBe(false);
    expect(panel.shadowRoot!.querySelector(".pnw-codegen-collapse")).toBeNull();
    expect(body().hidden).toBe(false);

    panel.collapsed = true;
    expect(body().hidden).toBe(false);
    panel.collapsible = true;
    expect(body().hidden).toBe(true);
  });

  it("uses one native disclosure button for the whole non-tool header and emits once per click", () => {
    const panel = mount();
    const changes: KtCodegenControlCollapseChangeDetail[] = [];
    panel.addEventListener(KT_CODEGEN_CONTROL_COLLAPSE_CHANGE, (event) => {
      changes.push((event as CustomEvent<KtCodegenControlCollapseChangeDetail>).detail);
    });
    panel.collapsible = true;
    panel.collapsed = true;
    expect(changes).toEqual([]);

    const button = panel.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-codegen-collapse")!;
    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.hasAttribute("tabindex")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe("pnw-codegen-control-body");
    expect(button.getAttribute("role")).toBeNull();
    const title = button.querySelector<HTMLElement>(".pnw-codegen-title-name")!;
    expect(title.textContent).toBe("预检结果");
    expect(button.contains(panel.shadowRoot!.querySelector(".pnw-codegen-filter"))).toBe(false);
    expect(button.contains(panel.shadowRoot!.querySelector(".pnw-codegen-path-toggle"))).toBe(false);
    button.focus();
    expect(panel.shadowRoot!.activeElement).toBe(button);
    title.click();

    expect(panel.collapsed).toBe(false);
    expect(changes).toEqual([{ collapsed: false }]);
    expect(panel.shadowRoot!.activeElement).toBe(
      panel.shadowRoot!.querySelector(".pnw-codegen-collapse"),
    );
    expect(panel.shadowRoot!.querySelector<HTMLElement>("#pnw-codegen-control-body")!.hidden).toBe(false);

    // Header padding delegates to the same disclosure without double firing.
    panel.shadowRoot!.querySelector<HTMLElement>(".pnw-codegen-title")!.click();
    expect(panel.collapsed).toBe(true);
    expect(changes).toEqual([{ collapsed: false }, { collapsed: true }]);
  });

  it("keeps filter, checkbox and its label independent from disclosure", () => {
    const panel = mount(model());
    const changes: KtCodegenControlCollapseChangeDetail[] = [];
    panel.addEventListener(KT_CODEGEN_CONTROL_COLLAPSE_CHANGE, (event) => {
      changes.push((event as CustomEvent<KtCodegenControlCollapseChangeDetail>).detail);
    });
    panel.collapsible = true;
    const root = panel.shadowRoot!;
    const issue = Array.from(root.querySelectorAll<HTMLButtonElement>(".pnw-codegen-filter"))
      .find((button) => button.textContent === "问题 1")!;
    issue.click();
    const path = panel.shadowRoot!.querySelector<HTMLInputElement>(".pnw-codegen-path-toggle input")!;
    path.click();
    const pathLabel = panel.shadowRoot!.querySelector<HTMLLabelElement>(".pnw-codegen-path-toggle")!;
    pathLabel.click();
    expect(panel.collapsed).toBe(false);
    expect(changes).toEqual([]);
  });

  it("preserves local view state and disclosure focus across folding", () => {
    const panel = mount(model());
    panel.collapsible = true;
    panel.splitRatio = 57;
    const root = panel.shadowRoot!;
    const issue = Array.from(root.querySelectorAll<HTMLButtonElement>(".pnw-codegen-filter"))
      .find((button) => button.textContent === "问题 1")!;
    issue.click();
    const path = panel.shadowRoot!.querySelector<HTMLInputElement>(".pnw-codegen-path-toggle input")!;
    path.click();

    const disclosure = panel.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-codegen-collapse")!;
    disclosure.focus();
    disclosure.click();
    expect(panel.shadowRoot!.activeElement).toBe(
      panel.shadowRoot!.querySelector(".pnw-codegen-collapse"),
    );
    panel.shadowRoot!.querySelector<HTMLButtonElement>(".pnw-codegen-collapse")!.click();

    const filters = Array.from(panel.shadowRoot!.querySelectorAll<HTMLButtonElement>(".pnw-codegen-filter"));
    expect(filters.find((button) => button.textContent === "问题 1")!.getAttribute("aria-pressed")).toBe("true");
    expect(panel.shadowRoot!.querySelector<HTMLInputElement>(".pnw-codegen-path-toggle input")!.checked).toBe(true);
    expect(panel.shadowRoot!.querySelector<HTMLElement>(".pnw-codegen-layout")!.style.getPropertyValue("--pnw-codegen-master")).toBe("57%");
  });
});
