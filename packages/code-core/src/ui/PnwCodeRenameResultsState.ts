export type PnwCodeRenameResultLevel = "dir" | "file" | "text";

export type PnwCodeRenameResultMatch = {
  readonly search: string;
  readonly replace: string;
};

export type PnwCodeRenameResultHit = {
  readonly id: string;
  readonly relativePath: string;
  readonly originalPath?: string;
  readonly plannedPath?: string;
  readonly targetPath?: string;
  readonly level: PnwCodeRenameResultLevel;
  readonly occurrences: number;
  readonly lines?: readonly number[];
  readonly encoding?: string;
  readonly status: string;
  readonly detail?: string;
  readonly matches?: readonly PnwCodeRenameResultMatch[];
};

export type PnwCodeRenameResultState = {
  readonly root: string;
  readonly applied: boolean;
  readonly hits: readonly PnwCodeRenameResultHit[];
};

export type PnwCodeRenameResultTone = "neutral" | "success" | "warning" | "danger";

export type PnwCodeRenameResultRow = {
  readonly id: string;
  readonly level: PnwCodeRenameResultLevel;
  readonly levelLabel: string;
  readonly relativePath: string;
  readonly sourceName: string;
  readonly sourceAddress: string;
  readonly targetOrPositionLabel: string;
  readonly originalPath: string;
  readonly plannedPath: string;
  readonly openPath: string;
  readonly openLine?: number;
  readonly occurrences: number;
  readonly encodingLabel: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly statusTone: PnwCodeRenameResultTone;
  readonly detail?: string;
  readonly sourceHighlightTerms: readonly string[];
  readonly editorHighlightTerms: readonly string[];
};

export type PnwCodeRenameResultPage = {
  readonly root: string;
  readonly applied: boolean;
  readonly rows: readonly PnwCodeRenameResultRow[];
  readonly offset: number;
  readonly totalRows: number;
  readonly nextOffset?: number;
};

const LEVEL_LABELS: Record<PnwCodeRenameResultLevel, string> = {
  dir: "文件夹",
  file: "文件",
  text: "文本",
};

const STATUS_PRESENTATION: Record<string, { label: string; tone: PnwCodeRenameResultTone }> = {
  preview: { label: "预览", tone: "neutral" },
  pending: { label: "待写盘", tone: "neutral" },
  applied: { label: "已替换", tone: "success" },
  skipped: { label: "已跳过", tone: "warning" },
  missing: { label: "缺失", tone: "warning" },
  conflict: { label: "冲突", tone: "danger" },
  error: { label: "错误", tone: "danger" },
  "encoding-error": { label: "编码错误", tone: "danger" },
};

function pathParts(value: string): { name: string; parent: string } {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const index = normalized.lastIndexOf("/");
  return index < 0
    ? { name: normalized, parent: "." }
    : { name: normalized.slice(index + 1), parent: normalized.slice(0, index) || "." };
}

function lineSummary(lines: readonly number[]): string {
  if (lines.length === 0) return "—";
  const shown = lines.slice(0, 4).map((line) => `L${line}`).join(", ");
  return lines.length > 4 ? `${shown}，……等 ${lines.length} 处` : shown;
}

function uniqueTerms(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Project Host-specific rename hits into one stable, presentation-ready result vocabulary. */
export function pnwCodeProjectRenameResults(
  state: PnwCodeRenameResultState,
): readonly PnwCodeRenameResultRow[] {
  return state.hits.map((hit) => {
    const source = pathParts(hit.relativePath);
    const target = pathParts(hit.targetPath ?? hit.relativePath);
    const presentation = STATUS_PRESENTATION[hit.status] ?? { label: hit.status, tone: "neutral" as const };
    const originalPath = hit.originalPath ?? hit.relativePath;
    const plannedPath = hit.plannedPath ?? hit.targetPath ?? originalPath;
    const sourceHighlightTerms = uniqueTerms((hit.matches ?? []).map((match) => match.search));
    const editorHighlightTerms = uniqueTerms((hit.matches ?? [])
      .map((match) => state.applied ? match.replace : match.search));
    return {
      id: hit.id,
      level: hit.level,
      levelLabel: LEVEL_LABELS[hit.level],
      relativePath: hit.relativePath,
      sourceName: source.name,
      sourceAddress: source.parent,
      targetOrPositionLabel: hit.level === "text" ? lineSummary(hit.lines ?? []) : target.name,
      originalPath,
      plannedPath,
      openPath: state.applied && hit.status === "applied" ? plannedPath : originalPath,
      openLine: hit.lines?.[0],
      occurrences: hit.occurrences,
      encodingLabel: hit.encoding ?? "",
      status: hit.status,
      statusLabel: presentation.label,
      statusTone: presentation.tone,
      detail: presentation.tone === "danger" || hit.status === "skipped" || hit.status === "missing"
        ? hit.detail
        : undefined,
      sourceHighlightTerms,
      editorHighlightTerms,
    };
  });
}

export function pnwCodePageRenameResults(
  state: PnwCodeRenameResultState,
  requestedOffset = 0,
  requestedPageSize = 300,
): PnwCodeRenameResultPage {
  return pnwCodePageRenameResultRows(
    state.root,
    state.applied,
    pnwCodeProjectRenameResults(state),
    requestedOffset,
    requestedPageSize,
  );
}

export function pnwCodePageRenameResultRows(
  root: string,
  applied: boolean,
  allRows: readonly PnwCodeRenameResultRow[],
  requestedOffset = 0,
  requestedPageSize = 300,
): PnwCodeRenameResultPage {
  const normalizedOffset = Number.isFinite(requestedOffset) ? Math.trunc(requestedOffset) : 0;
  const normalizedPageSize = Number.isFinite(requestedPageSize) ? Math.trunc(requestedPageSize) : 300;
  const offset = Math.min(allRows.length, Math.max(0, normalizedOffset));
  const pageSize = Math.min(1_000, Math.max(1, normalizedPageSize));
  const rows = allRows.slice(offset, offset + pageSize);
  const consumed = offset + rows.length;
  return {
    root,
    applied,
    rows,
    offset,
    totalRows: allRows.length,
    nextOffset: consumed < allRows.length ? consumed : undefined,
  };
}
