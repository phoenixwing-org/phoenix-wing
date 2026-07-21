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
