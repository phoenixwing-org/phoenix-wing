export type PnwWorkspacePathEntry = string | {
  readonly path: string;
  readonly type?: "file" | "dir";
};

/** Normalizes one concrete workspace-relative path without consulting a filesystem. */
export function pnwNormalizeWorkspacePath(value: string): string | null {
  const input = value.trim().replace(/\\/g, "/");
  if (!input || input.startsWith("/") || /^[a-z]:(?:\/|$)/i.test(input)) return null;
  const segments = input.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.includes("..")) return null;
  if (segments.length === 0) return input.split("/").every((segment) => !segment || segment === ".")
    ? "."
    : null;
  return segments.join("/");
}

/** Normalizes and de-duplicates concrete workspace paths while preserving first-seen order. */
export function pnwNormalizeWorkspacePaths(values: readonly string[]): string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const path = pnwNormalizeWorkspacePath(value);
    if (path) normalized.add(path);
  }
  return [...normalized];
}

/** Returns whether `candidate` is the same path as, or a descendant of, `parent`. */
export function pnwIsWorkspacePathWithin(candidate: string, parent: string): boolean {
  const normalizedCandidate = pnwNormalizeWorkspacePath(candidate);
  const normalizedParent = pnwNormalizeWorkspacePath(parent);
  if (!normalizedCandidate || !normalizedParent) return false;
  if (normalizedParent === ".") return true;
  return normalizedCandidate === normalizedParent || normalizedCandidate.startsWith(`${normalizedParent}/`);
}

/** Matches concrete file/dir entries used by Desk and host-specific workset adapters. */
export function pnwMatchesWorkspacePath(
  candidate: string,
  entries: readonly PnwWorkspacePathEntry[],
): boolean {
  const normalizedCandidate = pnwNormalizeWorkspacePath(candidate);
  if (!normalizedCandidate) return false;
  return entries.some((entry) => {
    const path = pnwNormalizeWorkspacePath(typeof entry === "string" ? entry : entry.path);
    if (!path) return false;
    const type = typeof entry === "string" ? "file" : entry.type ?? "file";
    return type === "dir"
      ? pnwIsWorkspacePathWithin(normalizedCandidate, path)
      : normalizedCandidate === path;
  });
}

/** Resolves a concrete workspace path relative to the most specific matching workset root. */
export function pnwRelativeToWorkspaceRoots(
  candidate: string,
  roots: readonly string[],
): string | undefined {
  const normalizedCandidate = pnwNormalizeWorkspacePath(candidate);
  if (!normalizedCandidate) return undefined;
  const candidates = pnwNormalizeWorkspacePaths(roots)
    .sort((left, right) => right.length - left.length);
  for (const root of candidates) {
    if (root === ".") return normalizedCandidate;
    if (normalizedCandidate === root) return normalizedCandidate.split("/").pop();
    if (pnwIsWorkspacePathWithin(normalizedCandidate, root)) {
      return normalizedCandidate.slice(root.length + 1);
    }
  }
  return undefined;
}
