// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { KtCodegenPlan } from "../src/api/contracts.js";
import {
  ktCodegenClampControlSplitPercent,
  ktCodegenControlResultBadges,
  ktCodegenControlResultItems,
  ktCodegenControlUnclosedForDiagnostic,
  ktCodegenExpectedEndFromDiagnostic,
} from "../src/ui/KtCodegenControlViewModel.js";
import type { KtCodegenControlUiModel } from "../src/ui/KtCodegenUiContracts.js";

function model(): KtCodegenControlUiModel {
  const diagnostic = {
    code: "marker.missing-end",
    severity: "error" as const,
    message: "missing END",
    path: { source: "source" as const, file: "src/a.cpp", row: 7 },
    marker: { kind: "start" as const, classId: "PNXThing", blockKey: "PARAM EQUAL" },
  };
  const info = { code: "preview.info", severity: "info" as const, message: "info" };
  const plan = {
    kind: "kt.codegen.plan",
    schemaVersion: 1,
    phase: "preview",
    targets: [],
    blockKeys: ["PARAM EQUAL"],
    artifacts: [],
    markerRegions: [{
      id: "region-1",
      path: "src/a.cpp",
      sourceFingerprint: "before",
      classId: "PNXThing",
      nameSuffix: "Thing",
      blockKey: "PARAM EQUAL",
      start: { line: 1 },
      end: { line: 2 },
    }],
    diagnostics: [diagnostic, info],
    hasChanges: false,
    canApply: false,
  } as unknown as KtCodegenPlan;
  return {
    kind: "kt.codegen.control-ui-model",
    schemaVersion: 1,
    documentId: "doc-1",
    fileName: "thing.json",
    selectedBlockKeys: ["PARAM EQUAL"],
    blocks: [{ key: "PARAM EQUAL", status: "unclosed", hitCount: 1, artifactCount: 0 }],
    unclosed: [{
      code: "marker.missing-end",
      path: "src/a.cpp",
      line: 7,
      blockKey: "PARAM EQUAL",
      expectedEnd: "// END KEVIN CAA WIZARD SECTION PNXThing PARAM EQUAL",
    }],
    preflight: { plan, reused: false, createdAt: "now", state: "ready", message: "ready" },
  };
}

describe("Codegen shared control UI projection", () => {
  it("uses the VS Code layout clamp contract", () => {
    expect(ktCodegenClampControlSplitPercent(Number.NaN)).toBe(42);
    expect(ktCodegenClampControlSplitPercent(8)).toBe(20);
    expect(ktCodegenClampControlSplitPercent(88)).toBe(75);
    expect(ktCodegenClampControlSplitPercent(44)).toBe(44);
  });

  it("keeps info out of issue/all lists without parsing messages", () => {
    const value = model();
    expect(ktCodegenControlResultItems(value, "hits").map((item) => item.kind)).toEqual(["hit"]);
    expect(ktCodegenControlResultItems(value, "issues").map((item) => item.kind)).toEqual(["issue"]);
    expect(ktCodegenControlResultItems(value, "all").map((item) => item.kind)).toEqual(["hit", "issue"]);
  });

  it("projects shared hit, issue, and write-state badges from structured plan data", () => {
    const value = model();
    const hit = ktCodegenControlResultItems(value, "hits")[0]!;
    expect(ktCodegenControlResultBadges(value, hit)).toEqual([
      { label: "1 命中", tone: "info" },
      { label: "错误", tone: "error" },
      { label: "未改写", tone: "muted" },
    ]);
    const issue = ktCodegenControlResultItems(value, "issues")[0]!;
    expect(ktCodegenControlResultBadges(value, issue)).toEqual([
      { label: "错误", tone: "error" },
    ]);
  });

  it.each([
    ["updated", "已改写", "success"],
    ["unchanged", "一致", "muted"],
    ["not-applied", "未应用", "warning"],
  ] as const)("renders the Host-provided %s region outcome", (change, label, tone) => {
    const value = model();
    const region = value.preflight!.plan.markerRegions[0]!;
    const artifact = {
      id: "artifact-1",
      regionId: region.id,
      blockKey: region.blockKey,
      target: "cpp.parameter" as const,
      classId: region.classId,
      sourceParameters: [],
      content: "generated",
    };
    const applied: KtCodegenControlUiModel = {
      ...value,
      preflight: {
        ...value.preflight!,
        plan: { ...value.preflight!.plan, artifacts: [artifact] } as KtCodegenPlan,
        state: "applied",
        regionOutcomes: [{ regionId: region.id, change }],
      },
    };
    const hit = ktCodegenControlResultItems(applied, "hits")[0]!;
    expect(ktCodegenControlResultBadges(applied, hit).at(-1)).toEqual({ label, tone });
  });

  it("matches END suggestions through structured diagnostic identity", () => {
    const value = model();
    const diagnostic = value.preflight!.plan.diagnostics[0]!;
    expect(ktCodegenControlUnclosedForDiagnostic(value, diagnostic)?.expectedEnd).toContain("PNXThing PARAM EQUAL");
    const { marker: _marker, ...withoutMarker } = diagnostic;
    expect(ktCodegenControlUnclosedForDiagnostic(value, withoutMarker)).toBeUndefined();
    expect(ktCodegenExpectedEndFromDiagnostic(diagnostic)?.expectedEnd).toBe(
      "// END KEVIN CAA WIZARD SECTION PNXThing PARAM EQUAL",
    );
  });
});
