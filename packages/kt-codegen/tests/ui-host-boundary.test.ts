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
    expect(packageJson.exports).toHaveProperty("./ui");
  });

  it("keeps UI runtime independent from all three hosts", () => {
    const runtime = [
      source("../src/ui/KtCodegenPrimaryPanel.ts"),
      source("../src/ui/KtCodegenControlPanel.ts"),
      source("../src/ui/KtCodegenControlViewModel.ts"),
      source("../src/ui/KtCodegenUiContracts.ts"),
    ].join("\n");

    expect(runtime).not.toMatch(/from ["'](?:vue|vscode|electron|@tauri-apps\/)/u);
    expect(runtime).not.toMatch(/acquireVsCodeApi|invoke\(|fetch\(|window\.phoenix/u);
    expect(runtime).toContain("--vscode-");
    expect(runtime).toContain("var(--border");
  });

  it("uses host-neutral ViewModels and composed events instead of services", () => {
    const primary = source("../src/ui/KtCodegenPrimaryPanel.ts");
    const control = source("../src/ui/KtCodegenControlPanel.ts");

    expect(primary).toContain("KtCodegenPrimaryUiModel");
    expect(primary).toContain('"kt-codegen-primary-action"');
    expect(primary).toContain('"kt-codegen-control-selection-change"');
    expect(control).toContain("KtCodegenControlUiModel");
    expect(control).toContain('"kt-codegen-control-open"');
    expect(control).toContain('"kt-codegen-control-copy-end"');
    expect(control).toContain('"kt-codegen-control-split-change"');
    expect(primary).toContain("composed: true");
    expect(control).toContain("composed: true");
  });
});
