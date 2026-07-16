export type PnwCodeRenameLevel = "dir" | "file" | "text";

export type PnwCodeRenameEntry = {
  readonly relativePath: string;
  readonly kind: "file" | "dir";
  /** Required only for file entries when text replacement is requested. */
  readonly text?: string;
};

export type PnwCodeRenameOptions = {
  readonly oldText: string;
  readonly newText: string;
  readonly levels?: readonly PnwCodeRenameLevel[];
  /** Default true. Set false for Windows/macOS case-insensitive target checks. */
  readonly caseSensitivePaths?: boolean;
};

export type PnwCodeRenameChange = {
  readonly level: PnwCodeRenameLevel;
  readonly relativePath: string;
  readonly targetPath?: string;
  readonly occurrences: number;
  readonly lines?: readonly number[];
  readonly status: "preview" | "conflict" | "invalid";
  readonly detail?: string;
};

export type PnwCodeRenamePlan = {
  readonly valid: boolean;
  readonly oldText: string;
  readonly newText: string;
  readonly levels: readonly PnwCodeRenameLevel[];
  readonly changes: readonly PnwCodeRenameChange[];
  readonly summary: { readonly dirs: number; readonly files: number; readonly textFiles: number; readonly occurrences: number; readonly conflicts: number };
  readonly diagnostics: readonly string[];
};

/**
 * Produces a side-effect-free plan for literal source text, filename and
 * directory-basename renames. Hosts remain responsible for filesystem reads,
 * case-only renames, encoding, confirmation and writes.
 */
export function pnwPlanCodeRename(
  entries: readonly PnwCodeRenameEntry[],
  options: PnwCodeRenameOptions,
): PnwCodeRenamePlan {
  const oldText = options.oldText;
  const newText = options.newText;
  const levels = pnwNormalizeRenameLevels(options.levels);
  const diagnostics: string[] = [];
  if (!oldText || !newText) diagnostics.push("旧值和新值均不能为空");
  if (oldText === newText) diagnostics.push("旧值与新值相同");
  if (newText.includes("/") || newText.includes("\\")) diagnostics.push("新名称不能包含路径分隔符");
  const normalizedEntries = entries.map((entry) => ({ ...entry, relativePath: pnwNormalizeRelativePath(entry.relativePath) }));
  if (normalizedEntries.some((entry) => !pnwIsSafeRelativePath(entry.relativePath))) diagnostics.push("输入包含越出工作区的相对路径");
  if (diagnostics.length) return pnwEmptyRenamePlan(oldText, newText, levels, diagnostics);

  const changes: PnwCodeRenameChange[] = [];
  if (levels.includes("text")) {
    for (const entry of normalizedEntries) {
      if (entry.kind !== "file" || entry.text === undefined) continue;
      const occurrences = pnwCountOccurrences(entry.text, oldText);
      if (!occurrences) continue;
      changes.push({ level: "text", relativePath: entry.relativePath, occurrences, lines: pnwHitLines(entry.text, oldText), status: "preview" });
    }
  }

  const pathChanges: PnwCodeRenameChange[] = [];
  for (const level of ["dir", "file"] as const) {
    if (!levels.includes(level)) continue;
    for (const entry of normalizedEntries) {
      if ((level === "dir" ? "dir" : "file") !== entry.kind) continue;
      const targetPath = pnwRenameBasename(entry.relativePath, oldText, newText);
      if (!targetPath) continue;
      pathChanges.push({ level, relativePath: entry.relativePath, targetPath, occurrences: 1, status: "preview" });
    }
  }

  const caseSensitive = options.caseSensitivePaths !== false;
  const existing = new Set(normalizedEntries.map((entry) => pnwPathKey(entry.relativePath, caseSensitive)));
  const targetCounts = new Map<string, number>();
  for (const change of pathChanges) {
    const key = pnwPathKey(change.targetPath!, caseSensitive);
    targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
  }
  for (const change of pathChanges) {
    const targetKey = pnwPathKey(change.targetPath!, caseSensitive);
    const sourceKey = pnwPathKey(change.relativePath, caseSensitive);
    const collides = targetKey !== sourceKey && (existing.has(targetKey) || (targetCounts.get(targetKey) ?? 0) > 1);
    changes.push(collides
      ? { ...change, status: "conflict", detail: existing.has(targetKey) ? `目标已存在：${change.targetPath}` : `多个条目指向同一目标：${change.targetPath}` }
      : change);
  }
  changes.sort((left, right) => pnwRenameLevelOrder(left.level) - pnwRenameLevelOrder(right.level) || left.relativePath.localeCompare(right.relativePath));
  const summary = {
    dirs: changes.filter((change) => change.level === "dir" && change.status === "preview").length,
    files: changes.filter((change) => change.level === "file" && change.status === "preview").length,
    textFiles: changes.filter((change) => change.level === "text" && change.status === "preview").length,
    occurrences: changes.reduce((count, change) => count + (change.status === "preview" ? change.occurrences : 0), 0),
    conflicts: changes.filter((change) => change.status === "conflict").length,
  };
  return { valid: true, oldText, newText, levels, changes, summary, diagnostics };
}

/** Applies only literal text changes after a host has accepted a preview plan. */
export function pnwApplyCodeRenameText(text: string, oldText: string, newText: string): string {
  return oldText ? text.split(oldText).join(newText) : text;
}

function pnwEmptyRenamePlan(oldText: string, newText: string, levels: readonly PnwCodeRenameLevel[], diagnostics: readonly string[]): PnwCodeRenamePlan {
  return { valid: false, oldText, newText, levels, changes: [], summary: { dirs: 0, files: 0, textFiles: 0, occurrences: 0, conflicts: 0 }, diagnostics };
}

function pnwNormalizeRenameLevels(levels: readonly PnwCodeRenameLevel[] | undefined): readonly PnwCodeRenameLevel[] {
  const allowed: readonly PnwCodeRenameLevel[] = ["dir", "file", "text"];
  const selected = levels?.filter((level): level is PnwCodeRenameLevel => allowed.includes(level)) ?? [];
  const resolved: readonly PnwCodeRenameLevel[] = selected.length ? selected : ["text"];
  return [...new Set(resolved)];
}

function pnwNormalizeRelativePath(value: string): string { return value.replace(/\\/g, "/").replace(/^\.\//, ""); }
function pnwIsSafeRelativePath(value: string): boolean { return Boolean(value) && !value.startsWith("/") && !value.split("/").includes(".."); }
function pnwPathKey(value: string, caseSensitive: boolean): string { return caseSensitive ? value : value.toLocaleLowerCase(); }
function pnwRenameBasename(path: string, oldText: string, newText: string): string | undefined {
  const slash = path.lastIndexOf("/");
  const base = path.slice(slash + 1);
  return base === oldText ? `${slash < 0 ? "" : `${path.slice(0, slash + 1)}`}${newText}` : undefined;
}
function pnwCountOccurrences(text: string, needle: string): number {
  let count = 0; let offset = 0;
  while ((offset = text.indexOf(needle, offset)) >= 0) { count += 1; offset += needle.length; }
  return count;
}
function pnwHitLines(text: string, needle: string): readonly number[] {
  return text.split(/\r?\n/).flatMap((line, index) => line.includes(needle) ? [index + 1] : []);
}
function pnwRenameLevelOrder(level: PnwCodeRenameLevel): number { return level === "dir" ? 0 : level === "file" ? 1 : 2; }
