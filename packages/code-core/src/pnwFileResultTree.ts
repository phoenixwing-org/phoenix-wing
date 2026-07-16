/** A serializable file result which can be displayed by any host UI. */
export type PnwFileResultItem = {
  readonly relativePath: string;
  readonly changed: boolean;
};

export type PnwFileResultGroupId = "changed" | "unchanged";
export type PnwFileResultSortMode = "filename" | "directory";

export type PnwFileResultGroup<T extends PnwFileResultItem> = {
  readonly id: PnwFileResultGroupId;
  readonly items: readonly T[];
};

export type PnwGroupFileResultOptions = {
  /** Default: filename. Ties are always resolved by the full relative path. */
  readonly sortMode?: PnwFileResultSortMode;
  /** Default: true. Hosts may hide the unchanged group without losing its data. */
  readonly includeUnchanged?: boolean;
};

/**
 * Groups file-operation results for native or web UIs without depending on a
 * specific editor framework. Changed files are always returned first.
 */
export function pnwGroupFileResults<T extends PnwFileResultItem>(
  items: readonly T[],
  options: PnwGroupFileResultOptions = {},
): readonly PnwFileResultGroup<T>[] {
  const sortMode = options.sortMode ?? "filename";
  const changed = items.filter((item) => item.changed).sort((a, b) => pnwCompareFileResults(a, b, sortMode));
  const unchanged = items.filter((item) => !item.changed).sort((a, b) => pnwCompareFileResults(a, b, sortMode));
  const groups: PnwFileResultGroup<T>[] = [{ id: "changed", items: changed }];
  if (options.includeUnchanged !== false) groups.push({ id: "unchanged", items: unchanged });
  return groups;
}

/** Compares file-operation results deterministically for a requested display mode. */
export function pnwCompareFileResults(
  left: PnwFileResultItem,
  right: PnwFileResultItem,
  sortMode: PnwFileResultSortMode = "filename",
): number {
  const leftPath = pnwNormalizeRelativePath(left.relativePath);
  const rightPath = pnwNormalizeRelativePath(right.relativePath);
  const leftKey = sortMode === "filename" ? pnwFileName(leftPath) : pnwDirectoryName(leftPath);
  const rightKey = sortMode === "filename" ? pnwFileName(rightPath) : pnwDirectoryName(rightPath);
  return pnwCompareText(leftKey, rightKey) || pnwCompareText(leftPath, rightPath);
}

function pnwNormalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function pnwFileName(value: string): string {
  return value.slice(value.lastIndexOf("/") + 1);
}

function pnwDirectoryName(value: string): string {
  const index = value.lastIndexOf("/");
  return index < 0 ? "" : value.slice(0, index);
}

function pnwCompareText(left: string, right: string): number {
  const leftFolded = left.toLocaleLowerCase();
  const rightFolded = right.toLocaleLowerCase();
  return leftFolded < rightFolded ? -1 : leftFolded > rightFolded ? 1 : left < right ? -1 : left > right ? 1 : 0;
}
