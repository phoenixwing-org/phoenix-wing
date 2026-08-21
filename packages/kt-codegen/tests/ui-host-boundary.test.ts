// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

describe("@phoenix-wing/kt-codegen/ui host boundary", () => {
  it("exports the shared Primary and preflight Web Components through a public entry", () => {
    const entry = source("../src/ui/index.ts");
    const packageJson = JSON.parse(source("../package.json")) as {
      exports?: Record<string, unknown>;
    };

    expect(entry).toContain('export * from "./KtCodegenPrimaryPanel.js"');
    expect(entry).toContain('export * from "./KtCodegenControlPanel.js"');
    expect(entry).toContain('export * from "./KtCodegenControlCatalog.js"');
    expect(entry).toContain('export * from "./KtCodegenApplyReport.js"');
    expect(packageJson.exports).toHaveProperty("./ui");
    expect(packageJson.exports).toHaveProperty("./ui/report-model");
    expect(packageJson.exports).toHaveProperty("./fixtures/*");
  });

  it("keeps UI runtime independent from all three hosts", () => {
    const runtime = [
      source("../src/ui/KtCodegenPrimaryPanel.ts"),
      source("../src/ui/KtCodegenControlPanel.ts"),
      source("../src/ui/KtCodegenControlCatalog.ts"),
      source("../src/ui/KtCodegenControlCatalogState.ts"),
      source("../src/ui/KtCodegenControlViewModel.ts"),
      source("../src/ui/KtCodegenUiContracts.ts"),
      source("../src/ui/KtCodegenApplyReportModel.ts"),
      source("../src/ui/KtCodegenApplyReport.ts"),
    ].join("\n");

    expect(runtime).not.toMatch(/from ["'](?:vue|vscode|electron|@tauri-apps\/)/u);
    expect(runtime).not.toMatch(/acquireVsCodeApi|invoke\(|fetch\(|window\.phoenix/u);
    expect(runtime).toContain("--vscode-");
    expect(runtime).toContain("var(--border");
  });

  it("uses host-neutral ViewModels and composed events instead of services", () => {
    const primary = source("../src/ui/KtCodegenPrimaryPanel.ts");
    const catalog = source("../src/ui/KtCodegenControlCatalog.ts");
    const control = source("../src/ui/KtCodegenControlPanel.ts");
    const report = source("../src/ui/KtCodegenApplyReport.ts");

    expect(primary).toContain("KtCodegenPrimaryUiModel");
    expect(primary).toContain('"kt-codegen-primary-action"');
    expect(primary).toContain("ktCodegenPrimaryActionDisabled");
    expect(primary).toContain("ktCodegenPrimaryControlsLocked");
    expect(primary).toContain('document.createElement("kt-codegen-control-catalog")');
    expect(primary).toContain("grid-auto-rows: max-content; align-content: start; gap: 0;");
    expect(primary).toContain(".pnw-codegen-mini { min-width: 0; margin: 0; overflow: hidden; border: 0; border-block-end: 1px solid var(--pnw-codegen-border); border-radius: 0;");
    expect(primary).not.toContain(".pnw-codegen-mini { min-width: 0; margin: 0 4px;");
    expect(primary).not.toContain(".pnw-codegen-mini { min-width: 0; margin: 0; overflow: hidden; border: 1px solid");
    expect(primary).toContain(".pnw-codegen-report-directory { width: 100%; min-height: 25px; margin: 5px 0 0; padding: 2px 7px;");
    expect(catalog).toContain('"kt-codegen-control-selection-change"');
    expect(catalog).toContain('"kt-codegen-control-output"');
    expect(catalog).toContain("KT_CODEGEN_CONTROL_CATALOG_GROUPS");
    expect(control).toContain("KtCodegenControlUiModel");
    expect(control).toContain('"kt-codegen-control-open"');
    expect(control).toContain('"kt-codegen-control-copy-end"');
    expect(control).toContain('"kt-codegen-control-split-change"');
    expect(report).toContain('"kt-codegen-apply-report-action"');
    expect(report).toContain('"kt-codegen-apply-report-filter-change"');
    expect(primary).toContain("composed: true");
    expect(control).toContain("composed: true");
  });
});
