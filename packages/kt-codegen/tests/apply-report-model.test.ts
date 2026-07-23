// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  ktCodegenApplyReportTotals,
  ktCodegenBuildApplyReport,
  ktCodegenApplyReportChangeLabel,
  ktCodegenApplyReportHealthLabel,
  ktCodegenFilterApplyReportItems,
  type KtCodegenApplyReportItem,
} from "../src/ui/KtCodegenApplyReportModel.js";

function item(documentId: string, health: KtCodegenApplyReportItem["health"], change: KtCodegenApplyReportItem["change"]): KtCodegenApplyReportItem {
  return {
    documentId,
    fileName: `${documentId}.json`,
    displayPath: documentId,
    health,
    change,
    reasonCode: change,
    errorCount: health === "error" ? 1 : 0,
    preflightRegionCount: 1,
    preflightArtifactCount: 1,
    preflightDiagnosticCount: 0,
    preflightErrorCount: 0,
    modifiedFileCount: change === "updated" ? 1 : 0,
    writtenRegionCount: change === "updated" ? 1 : 0,
    elapsedMilliseconds: 10,
    issues: [],
  };
}

describe("shared Codegen apply report model", () => {
  const items = [
    item("a", "success", "updated"),
    item("b", "success", "unchanged"),
    item("c", "error", "not-applied"),
  ];

  it("keeps health and source change as independent totals", () => {
    expect(ktCodegenApplyReportTotals(items)).toEqual({
      total: 3, success: 2, warning: 0, error: 1,
      updated: 1, unchanged: 1, partial: 0, notApplied: 1,
    });
    expect(ktCodegenBuildApplyReport({
      reportId: "report-1", applyKind: "batch", startedAt: "start", finishedAt: "finish",
      elapsedMilliseconds: Number.NaN, items,
    })).toMatchObject({ elapsedMilliseconds: 0, totals: { total: 3, unchanged: 1 } });
  });

  it("filters the batch but never hides the explicitly selected JSON", () => {
    expect(ktCodegenFilterApplyReportItems(items, {
      health: new Set(["success"]), change: new Set(["updated"]),
    }).map((value) => value.documentId)).toEqual(["a"]);
    expect(ktCodegenFilterApplyReportItems(items, {
      documentId: "c", health: new Set(), change: new Set(),
    }).map((value) => value.documentId)).toEqual(["c"]);
  });

  it("uses the same short dual-axis vocabulary in every consumer", () => {
    expect(["success", "warning", "error"].map((value) => (
      ktCodegenApplyReportHealthLabel(value as KtCodegenApplyReportItem["health"])
    ))).toEqual(["正常", "警告", "错误"]);
    expect(["updated", "unchanged", "partial", "not-applied"].map((value) => (
      ktCodegenApplyReportChangeLabel(value as KtCodegenApplyReportItem["change"])
    ))).toEqual(["改写", "一致", "部分改写", "未应用"]);
  });
});
