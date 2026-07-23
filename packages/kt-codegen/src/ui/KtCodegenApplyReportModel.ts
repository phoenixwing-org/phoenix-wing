// SPDX-License-Identifier: Apache-2.0

export const KT_CODEGEN_APPLY_REPORT_KIND = "kt.codegen.apply-report" as const;
export const KT_CODEGEN_APPLY_REPORT_SCHEMA_VERSION = 1 as const;

export type KtCodegenApplyReportHealth = "success" | "warning" | "error";
export type KtCodegenApplyReportChange = "updated" | "unchanged" | "partial" | "not-applied";

export interface KtCodegenApplyReportIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  /** 用户可见的 1-based 行号。 */
  readonly line?: number;
}

export interface KtCodegenApplyReportItem {
  /** Host 自己可验证并重新打开的稳定文档身份；组件不解释其格式。 */
  readonly documentId: string;
  readonly fileName: string;
  readonly displayPath: string;
  readonly health: KtCodegenApplyReportHealth;
  readonly change: KtCodegenApplyReportChange;
  readonly reasonCode: string;
  readonly errorCount: number;
  readonly preflightRegionCount: number;
  readonly preflightArtifactCount: number;
  readonly preflightDiagnosticCount: number;
  readonly preflightErrorCount: number;
  readonly modifiedFileCount: number;
  readonly writtenRegionCount: number;
  readonly elapsedMilliseconds: number;
  readonly message?: string;
  readonly issues: readonly KtCodegenApplyReportIssue[];
}

export interface KtCodegenApplyReportTotals {
  readonly total: number;
  readonly success: number;
  readonly warning: number;
  readonly error: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly partial: number;
  readonly notApplied: number;
}

export interface KtCodegenApplyReportUiModel {
  readonly kind: typeof KT_CODEGEN_APPLY_REPORT_KIND;
  readonly schemaVersion: typeof KT_CODEGEN_APPLY_REPORT_SCHEMA_VERSION;
  readonly reportId: string;
  readonly applyKind: "single" | "batch";
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly elapsedMilliseconds: number;
  readonly items: readonly KtCodegenApplyReportItem[];
  readonly totals: KtCodegenApplyReportTotals;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface KtCodegenApplyReportFilter {
  readonly documentId?: string;
  readonly health?: ReadonlySet<KtCodegenApplyReportHealth>;
  readonly change?: ReadonlySet<KtCodegenApplyReportChange>;
}

export function ktCodegenApplyReportTotals(
  items: readonly Pick<KtCodegenApplyReportItem, "health" | "change">[],
): KtCodegenApplyReportTotals {
  return {
    total: items.length,
    success: items.filter((item) => item.health === "success").length,
    warning: items.filter((item) => item.health === "warning").length,
    error: items.filter((item) => item.health === "error").length,
    updated: items.filter((item) => item.change === "updated").length,
    unchanged: items.filter((item) => item.change === "unchanged").length,
    partial: items.filter((item) => item.change === "partial").length,
    notApplied: items.filter((item) => item.change === "not-applied").length,
  };
}

export function ktCodegenBuildApplyReport(input: {
  readonly reportId: string;
  readonly applyKind: "single" | "batch";
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly elapsedMilliseconds: number;
  readonly items: readonly KtCodegenApplyReportItem[];
}): KtCodegenApplyReportUiModel {
  const duration = Number.isFinite(input.elapsedMilliseconds)
    ? Math.max(0, Math.round(input.elapsedMilliseconds))
    : 0;
  return {
    kind: KT_CODEGEN_APPLY_REPORT_KIND,
    schemaVersion: KT_CODEGEN_APPLY_REPORT_SCHEMA_VERSION,
    reportId: input.reportId,
    applyKind: input.applyKind,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    elapsedMilliseconds: duration,
    items: [...input.items],
    totals: ktCodegenApplyReportTotals(input.items),
    errorCount: input.items.reduce((count, item) => count
      + item.issues.filter((issue) => issue.severity === "error").length, 0),
    warningCount: input.items.reduce((count, item) => count
      + item.issues.filter((issue) => issue.severity === "warning").length, 0),
  };
}

export function ktCodegenFilterApplyReportItems(
  items: readonly KtCodegenApplyReportItem[],
  filter: KtCodegenApplyReportFilter,
): readonly KtCodegenApplyReportItem[] {
  const documents = filter.documentId
    ? items.filter((item) => item.documentId === filter.documentId)
    : items;
  if (documents.length === 1) return documents;
  return documents.filter((item) => (
    (!filter.health || filter.health.has(item.health))
    && (!filter.change || filter.change.has(item.change))
  ));
}

export function ktCodegenApplyReportHealthLabel(value: KtCodegenApplyReportHealth): string {
  return value === "success" ? "正常" : value === "warning" ? "警告" : "错误";
}

export function ktCodegenApplyReportChangeLabel(value: KtCodegenApplyReportChange): string {
  return value === "updated" ? "改写" : value === "unchanged" ? "一致" : value === "partial" ? "部分改写" : "未应用";
}

export function ktCodegenApplyReportDuration(milliseconds: number): string {
  const value = Number.isFinite(milliseconds) ? Math.max(0, Math.round(milliseconds)) : 0;
  if (value < 1_000) return `${value} ms`;
  if (value < 10_000) return `${(value / 1_000).toFixed(2)} s`;
  return `${(value / 1_000).toFixed(1)} s`;
}
