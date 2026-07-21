// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenPlan } from "../api/contracts.js";

/** 三种 Host 共用的 Codegen 预检状态；只有 ready 可用于 Apply。 */
export type KtCodegenPreflightUiState = "ready" | "applied" | "stale";

/** Host 已完成安全判断后的预检 UI 投影。组件只展示，不重新推导门禁。 */
export interface KtCodegenPreflightUiModel {
  readonly plan: KtCodegenPlan;
  readonly reused: boolean;
  readonly createdAt: string;
  readonly state: KtCodegenPreflightUiState;
  readonly message: string;
}

/** 控制符目录和预检 View 共用的 Host 无关会话投影。 */
export interface KtCodegenControlUiModel {
  readonly kind: "kt.codegen.control-ui-model";
  readonly schemaVersion: 1;
  readonly documentId: string;
  readonly fileName: string;
  readonly selectedBlockKeys: readonly KtCodegenBlockKey[];
  readonly blocks: readonly KtCodegenControlBlockStateUiModel[];
  /** Host 根据结构化 marker 上下文生成的只读修复建议；组件不得解析诊断 message。 */
  readonly unclosed: readonly KtCodegenUnclosedUiModel[];
  readonly preflight?: KtCodegenPreflightUiModel;
}

export interface KtCodegenControlBlockStateUiModel {
  readonly key: KtCodegenBlockKey;
  readonly status: "unselected" | "pending" | "hit" | "unclosed" | "missing";
  readonly hitCount: number;
  readonly artifactCount: number;
}

export interface KtCodegenUnclosedUiModel {
  readonly code: "marker.missing-end";
  readonly path: string;
  readonly line: number;
  readonly blockKey: KtCodegenBlockKey;
  readonly expectedEnd: string;
}

export type KtCodegenControlUiFilter = "hits" | "issues" | "all";

export interface KtCodegenControlOpenDetail {
  readonly path: string;
  readonly line: number;
}

export interface KtCodegenControlCopyEndDetail extends KtCodegenControlOpenDetail {
  readonly blockKey: KtCodegenBlockKey;
  readonly expectedEnd: string;
}

export interface KtCodegenControlSplitDetail {
  readonly ratio: number;
}

export interface KtCodegenPrimaryDocumentUiModel {
  readonly id: string;
  readonly fileName: string;
  readonly displayPath: string;
  readonly itemCount: number;
  readonly className: string;
  readonly namePrefix: string;
  readonly nameMiddle: string;
  readonly nameSpace: string;
  readonly appendFunction: string;
  readonly open: boolean;
  readonly active: boolean;
  readonly dirty: boolean;
  readonly externalConflict: boolean;
  readonly externalState: "current" | "changed" | "deleted";
  readonly diagnosticCount: number;
}

export interface KtCodegenPrimaryCandidateUiModel {
  readonly id: string;
  readonly displayPath: string;
  readonly markerCount: number;
  readonly encoding: string;
  readonly eol: "lf" | "crlf";
}

export interface KtCodegenPrimaryReportUiModel {
  readonly id: string;
  readonly subject: string;
  readonly startedAt: string;
  readonly applyKind: "single" | "batch";
  readonly itemCount: number;
  readonly health: "success" | "warning" | "error";
  readonly change: "updated" | "unchanged" | "partial" | "not-applied";
}

export interface KtCodegenPrimaryUiModel {
  readonly kind: "kt.codegen.primary-ui-model";
  readonly schemaVersion: 1;
  readonly documents: readonly KtCodegenPrimaryDocumentUiModel[];
  readonly activeId?: string;
  readonly controls?: KtCodegenControlUiModel;
  readonly candidates: readonly KtCodegenPrimaryCandidateUiModel[];
  readonly reports: readonly KtCodegenPrimaryReportUiModel[];
  readonly reportInvalidCount: number;
  readonly operation?: "discovery" | "candidates" | "batch-apply";
  readonly batch?: { readonly current: number; readonly total: number; readonly fileName: string };
  readonly running: boolean;
  readonly capabilities: {
    readonly openJson: boolean;
    readonly importCsv: boolean;
    readonly applyAll: boolean;
    readonly scanCandidates: boolean;
    readonly openReportDirectory: boolean;
  };
}

export type KtCodegenPrimaryAction =
  | "openJson"
  | "importCsv"
  | "applyAll"
  | "refresh"
  | "scanCandidates"
  | "cancelOperation"
  | "openReportDirectory";

export type KtCodegenPrimaryActionDetail =
  | { readonly action: KtCodegenPrimaryAction }
  | { readonly action: "openDocument" | "openCandidate" | "openReport"; readonly id: string }
  | { readonly action: "updateMeta"; readonly id: string; readonly field: "namePrefix" | "nameMiddle" | "nameSpace" | "appendFunction"; readonly value: string };

export interface KtCodegenControlSelectionDetail {
  readonly blockKeys: readonly KtCodegenBlockKey[];
  readonly singleMode: boolean;
}
