// SPDX-License-Identifier: Apache-2.0

export type PnwCodeUuidResultState = "pending" | "cancelled" | "applied" | "blocked";

export interface PnwCodeUuidResultHit {
  readonly id: string;
  readonly fileId: string;
  readonly relativePath: string;
  readonly line: number;
  readonly column: number;
  readonly from: string;
  readonly normalized: string;
  readonly kind: "uuid" | "guid32" | "caa-guid" | "suspicious";
  readonly to?: string;
  readonly state?: PnwCodeUuidResultState;
  readonly warning?: string;
}

export interface PnwCodeUuidResultFile {
  readonly uri: string;
  readonly relativePath: string;
  readonly encoding: string;
}

export interface PnwCodeUuidHitGroup {
  readonly normalized: string;
  readonly displayValue: string;
  readonly hits: readonly PnwCodeUuidResultHit[];
}

export interface PnwCodeUuidFileResultRow {
  readonly uri: string;
  readonly relativePath: string;
  readonly encoding: string;
  readonly hitCount: number;
  readonly firstLine: number;
  readonly state: PnwCodeUuidResultState;
  readonly hasApplied: boolean;
  readonly warnings: readonly string[];
  readonly mappings: readonly {
    readonly line: number;
    readonly column: number;
    readonly from: string;
    readonly to: string;
  }[];
}

export function pnwCodeFormatUuidDisplay(value: string): string {
  const normalized = value.replace(/[^0-9a-f]/giu, "").toLocaleLowerCase();
  if (normalized.length !== 32) return value;
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

export function pnwCodeGroupUuidHits(
  hits: readonly PnwCodeUuidResultHit[],
): readonly PnwCodeUuidHitGroup[] {
  const groups = new Map<string, PnwCodeUuidResultHit[]>();
  for (const hit of hits) {
    const key = hit.normalized || hit.from;
    const group = groups.get(key) ?? [];
    group.push(hit);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([normalized, groupHits]) => ({
      normalized,
      displayValue: pnwCodeFormatUuidDisplay(normalized),
      hits: [...groupHits].sort((left, right) =>
        left.relativePath.localeCompare(right.relativePath)
        || left.line - right.line
        || left.column - right.column
        || left.id.localeCompare(right.id)),
    }));
}

export function pnwCodeSelectUuidHitIds(
  hits: readonly PnwCodeUuidResultHit[],
  requestedIds: readonly string[],
): readonly string[] {
  const requested = new Set(requestedIds);
  return hits
    .filter((hit) => (hit.state ?? "pending") === "pending" && requested.has(hit.id))
    .map((hit) => hit.id);
}

export function pnwCodeProjectUuidFiles(
  files: readonly PnwCodeUuidResultFile[],
  hits: readonly PnwCodeUuidResultHit[],
): readonly PnwCodeUuidFileResultRow[] {
  const hitsByFile = new Map<string, PnwCodeUuidResultHit[]>();
  for (const hit of hits) {
    const group = hitsByFile.get(hit.fileId) ?? [];
    group.push(hit);
    hitsByFile.set(hit.fileId, group);
  }
  return files
    .flatMap((file): PnwCodeUuidFileResultRow[] => {
      const fileHits = hitsByFile.get(file.uri) ?? [];
      if (!fileHits.length) return [];
      const sorted = [...fileHits].sort((left, right) => left.line - right.line || left.column - right.column);
      const states = sorted.map((hit) => hit.state ?? "pending");
      const state: PnwCodeUuidResultState = states.includes("pending")
        ? "pending"
        : states.includes("blocked")
          ? "blocked"
          : states.includes("cancelled")
            ? "cancelled"
            : "applied";
      return [{
        ...file,
        hitCount: sorted.length,
        firstLine: sorted[0]?.line ?? 1,
        state,
        hasApplied: states.includes("applied"),
        warnings: [...new Set(sorted.map((hit) => hit.warning).filter((warning): warning is string => Boolean(warning)))],
        mappings: sorted.slice(0, 8).map((hit) => ({
          line: hit.line,
          column: hit.column,
          from: hit.from,
          to: hit.to ?? "",
        })),
      }];
    })
    .sort((left, right) =>
      pnwCodeBasename(left.relativePath).localeCompare(pnwCodeBasename(right.relativePath), undefined, { sensitivity: "base" })
      || left.relativePath.localeCompare(right.relativePath));
}

export function pnwCodeSelectUuidFileUris(
  rows: readonly PnwCodeUuidFileResultRow[],
  requestedUris: readonly string[],
): readonly string[] {
  const requested = new Set(requestedUris);
  return rows.filter((row) => row.state === "pending" && requested.has(row.uri)).map((row) => row.uri);
}

export function pnwCodeSelectedUuidGroupCount(
  hits: readonly PnwCodeUuidResultHit[],
  selectedHitIds: readonly string[],
): number {
  const selected = new Set(selectedHitIds);
  return new Set(hits.filter((hit) => selected.has(hit.id)).map((hit) => hit.normalized || hit.from)).size;
}

function pnwCodeBasename(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}
