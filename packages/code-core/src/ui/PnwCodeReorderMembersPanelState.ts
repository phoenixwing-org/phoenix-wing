// SPDX-License-Identifier: Apache-2.0

export type PnwCodeReorderMembersPanelPresentation = "ribbon" | "detailBlock" | "results";

export type PnwCodeReorderMembersRowState =
  | "unchanged"
  | "pending"
  | "cancelled"
  | "applied"
  | "blocked"
  | "reverted";

export interface PnwCodeReorderMembersPanelRow {
  /** Host 可验证并重新打开的稳定文件身份；组件不解释 URI 格式。 */
  readonly uri: string;
  readonly relativePath: string;
  readonly kind: "header" | "source";
  readonly encoding: string;
  readonly changed: boolean;
  readonly state: PnwCodeReorderMembersRowState;
  readonly warnings: readonly string[];
}

export interface PnwCodeReorderMembersPanelCapabilities {
  readonly scan?: boolean;
  readonly apply?: boolean;
  readonly addToWorkset?: boolean;
  readonly open?: boolean;
  readonly preview?: boolean;
  readonly cancel?: boolean;
  readonly gitDiff?: boolean;
  readonly revert?: boolean;
  readonly selection?: boolean;
}

/** Browser-only component snapshot. Host IO and confirmation never enter this model. */
export interface PnwCodeReorderMembersPanelModel {
  readonly presentation: PnwCodeReorderMembersPanelPresentation;
  readonly status: "idle" | "running" | "done" | "error";
  readonly message?: string;
  readonly scanned?: number;
  readonly reorderResults?: readonly PnwCodeReorderMembersPanelRow[];
  readonly reorderRevision?: number;
  readonly reorderSelectedUris?: readonly string[];
  readonly capabilities?: PnwCodeReorderMembersPanelCapabilities;
}

export interface PnwCodeReorderMembersSelectionState {
  readonly selectedUris: readonly string[];
  readonly revision?: number;
}

export interface PnwCodeReorderMembersPanelProjection {
  readonly hasCache: boolean;
  readonly running: boolean;
  readonly changedRows: readonly PnwCodeReorderMembersPanelRow[];
  readonly unchangedRows: readonly PnwCodeReorderMembersPanelRow[];
  readonly pendingRows: readonly PnwCodeReorderMembersPanelRow[];
  readonly selectedPendingUris: readonly string[];
  readonly allPendingSelected: boolean;
  readonly somePendingSelected: boolean;
  readonly applyDisabled: boolean;
  readonly worksetDisabled: boolean;
  readonly applyLabel: string;
}

export function pnwCodeNextReorderSelection(
  previous: PnwCodeReorderMembersSelectionState,
  next: Pick<PnwCodeReorderMembersPanelModel, "reorderResults" | "reorderRevision" | "reorderSelectedUris">,
): PnwCodeReorderMembersSelectionState {
  if (!Array.isArray(next.reorderResults)) {
    return { selectedUris: [...previous.selectedUris], revision: previous.revision };
  }
  const pending = new Set(next.reorderResults
    .filter((row) => row.state === "pending")
    .map((row) => row.uri));
  if (Array.isArray(next.reorderSelectedUris)) {
    return {
      selectedUris: unique(next.reorderSelectedUris.filter((uri) => pending.has(uri))),
      revision: next.reorderRevision,
    };
  }
  if (previous.revision === undefined || next.reorderRevision !== previous.revision) {
    return { selectedUris: [...pending], revision: next.reorderRevision };
  }
  return {
    selectedUris: unique(previous.selectedUris.filter((uri) => pending.has(uri))),
    revision: previous.revision,
  };
}

export function pnwCodeSetReorderSelection(
  current: PnwCodeReorderMembersSelectionState,
  model: Pick<PnwCodeReorderMembersPanelModel, "reorderResults">,
  requestedUris: readonly string[],
): PnwCodeReorderMembersSelectionState {
  const pending = new Set((model.reorderResults ?? [])
    .filter((row) => row.state === "pending")
    .map((row) => row.uri));
  return {
    selectedUris: unique(requestedUris.filter((uri) => pending.has(uri))),
    revision: current.revision,
  };
}

export function pnwCodeProjectReorderMembersPanel(
  model: PnwCodeReorderMembersPanelModel,
  selection: PnwCodeReorderMembersSelectionState,
): PnwCodeReorderMembersPanelProjection {
  const hasCache = Array.isArray(model.reorderResults);
  const rows = hasCache ? model.reorderResults!.filter((row) => row.state !== "cancelled") : [];
  const changedRows = rows.filter((row) => row.state !== "unchanged");
  const unchangedRows = rows.filter((row) => row.state === "unchanged");
  const pendingRows = changedRows.filter((row) => row.state === "pending");
  const pending = new Set(pendingRows.map((row) => row.uri));
  const selectedPendingUris = unique(selection.selectedUris.filter((uri) => pending.has(uri)));
  const running = model.status === "running";
  return {
    hasCache,
    running,
    changedRows,
    unchangedRows,
    pendingRows,
    selectedPendingUris,
    allPendingSelected: pendingRows.length > 0 && selectedPendingUris.length === pendingRows.length,
    somePendingSelected: selectedPendingUris.length > 0 && selectedPendingUris.length < pendingRows.length,
    applyDisabled: running || selectedPendingUris.length === 0,
    worksetDisabled: running || !hasCache,
    applyLabel: selectedPendingUris.length ? `应用所选（${selectedPendingUris.length}）` : "应用所选",
  };
}

export function pnwCodeReorderStateLabel(value: PnwCodeReorderMembersRowState): string {
  return ({
    pending: "待写盘",
    applied: "已写盘",
    blocked: "未写入",
    reverted: "已还原",
    unchanged: "无变更",
    cancelled: "已移除",
  })[value];
}

export function pnwCodeReorderStateMark(value: PnwCodeReorderMembersRowState): string {
  return ({ pending: "M", applied: "✓", blocked: "!", reverted: "↶", unchanged: "—", cancelled: "" })[value];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
