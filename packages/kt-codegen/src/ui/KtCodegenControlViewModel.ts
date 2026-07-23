// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenDiagnostic } from "../model/diagnostic.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import { ktCodegenIsBlockKey } from "../blocks/legacy-blocks.js";
import type {
  KtCodegenControlUiFilter,
  KtCodegenControlUiModel,
  KtCodegenUnclosedUiModel,
} from "./KtCodegenUiContracts.js";

export type KtCodegenControlResultItem =
  | { readonly kind: "hit"; readonly key: string; readonly region: KtCodegenMarkerRegion }
  | { readonly kind: "issue"; readonly key: string; readonly diagnostic: KtCodegenDiagnostic };

export interface KtCodegenControlResultBadge {
  readonly label: string;
  readonly tone: "info" | "success" | "warning" | "error" | "muted";
}

export function ktCodegenClampControlSplitPercent(value: number): number {
  if (!Number.isFinite(value)) return 42;
  return Math.max(20, Math.min(75, value));
}

export function ktCodegenControlResultItems(
  model: KtCodegenControlUiModel | undefined,
  filter: KtCodegenControlUiFilter,
): readonly KtCodegenControlResultItem[] {
  const plan = model?.preflight?.plan;
  if (!plan) return [];
  const items: KtCodegenControlResultItem[] = [];
  if (filter === "hits" || filter === "all") {
    for (const region of plan.markerRegions) {
      items.push({ kind: "hit", key: `hit:${region.id}`, region });
    }
  }
  if (filter === "issues" || filter === "all") {
    plan.diagnostics.forEach((diagnostic, index) => {
      if (diagnostic.severity !== "info") {
        items.push({ kind: "issue", key: `issue:${index}`, diagnostic });
      }
    });
  }
  return items;
}

/**
 * 共享预检列表的结构化状态标签。只使用 plan / marker / artifact 身份推导，
 * 不解析本地化 message，也不猜测 Host 尚未提供的逐区域写回结果。
 */
export function ktCodegenControlResultBadges(
  model: KtCodegenControlUiModel,
  item: KtCodegenControlResultItem,
): readonly KtCodegenControlResultBadge[] {
  if (item.kind === "issue") {
    return [{
      label: item.diagnostic.severity === "error"
        ? "错误"
        : item.diagnostic.severity === "warning" ? "警告" : "信息",
      tone: item.diagnostic.severity === "info" ? "info" : item.diagnostic.severity,
    }];
  }
  const plan = model.preflight?.plan;
  if (!plan) return [];
  const hitCount = plan.markerRegions.filter((region) => region.blockKey === item.region.blockKey).length;
  const relatedDiagnostics = plan.diagnostics.filter((diagnostic) => {
    if (diagnostic.marker?.blockKey === item.region.blockKey
      && diagnostic.marker.classId === item.region.classId) return true;
    const row = diagnostic.path?.row;
    return diagnostic.path?.source === "source"
      && diagnostic.path.file === item.region.path
      && row !== undefined
      && row >= item.region.start.line
      && row <= item.region.end.line;
  });
  const severity = relatedDiagnostics.some((diagnostic) => diagnostic.severity === "error")
    ? "error" as const
    : relatedDiagnostics.some((diagnostic) => diagnostic.severity === "warning")
      ? "warning" as const
      : undefined;
  const artifactCount = plan.artifacts.filter((artifact) => artifact.regionId === item.region.id).length;
  const badges: KtCodegenControlResultBadge[] = [{
    label: `${hitCount} 命中`,
    tone: "info",
  }];
  if (severity) badges.push({ label: severity === "error" ? "错误" : "警告", tone: severity });
  const appliedOutcome = model.preflight?.regionOutcomes
    ?.find((outcome) => outcome.regionId === item.region.id)?.change;
  if (!artifactCount) badges.push({ label: "未改写", tone: "muted" });
  else if (model.preflight?.state === "applied" && appliedOutcome === "updated") {
    badges.push({ label: "已改写", tone: "success" });
  } else if (model.preflight?.state === "applied" && appliedOutcome === "unchanged") {
    badges.push({ label: "一致", tone: "muted" });
  } else if (model.preflight?.state === "applied" && appliedOutcome === "not-applied") {
    badges.push({ label: "未应用", tone: "warning" });
  } else if (model.preflight?.state === "applied") {
    badges.push({ label: "已应用", tone: "success" });
  }
  else if (model.preflight?.state === "stale") badges.push({ label: "已过期", tone: "warning" });
  else badges.push({ label: "待改写", tone: "info" });
  return badges;
}

export function ktCodegenControlUnclosedForDiagnostic(
  model: KtCodegenControlUiModel,
  diagnostic: KtCodegenDiagnostic,
): KtCodegenUnclosedUiModel | undefined {
  if (diagnostic.code !== "marker.missing-end" || !diagnostic.path?.file || diagnostic.path.row === undefined) {
    return undefined;
  }
  return model.unclosed.find((candidate) => (
    candidate.code === diagnostic.code
    && candidate.path === diagnostic.path?.file
    && candidate.line === diagnostic.path?.row
    && candidate.blockKey === diagnostic.marker?.blockKey
  ));
}

/**
 * 只从 Wing 的结构化 marker 身份生成旧协议 END；不得从本地化 message 反向解析。
 */
export function ktCodegenExpectedEndFromDiagnostic(
  diagnostic: KtCodegenDiagnostic,
): KtCodegenUnclosedUiModel | undefined {
  const marker = diagnostic.marker;
  const path = diagnostic.path;
  if (diagnostic.code !== "marker.missing-end"
    || marker?.kind !== "start"
    || !marker.classId.trim()
    || !ktCodegenIsBlockKey(marker.blockKey)
    || !path?.file
    || path.row === undefined) return undefined;
  return {
    code: "marker.missing-end",
    path: path.file,
    line: path.row,
    blockKey: marker.blockKey,
    expectedEnd: `// END KEVIN CAA WIZARD SECTION ${marker.classId} ${marker.blockKey}`,
  };
}
