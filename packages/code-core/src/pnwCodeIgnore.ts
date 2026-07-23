export type PnwCodeIgnoreMatchOptions = {
  /** Match case exactly. Defaults to true so POSIX-style workspace paths stay precise. */
  caseSensitive?: boolean;
};

export type PnwCodeIgnoreNormalizeOptions = PnwCodeIgnoreMatchOptions & {
  /** Remove repeated rules while preserving the first spelling and order. */
  dedupe?: boolean;
};

export type PnwCodeIgnoreNameOptions = PnwCodeIgnoreMatchOptions & {
  /** Treat every dot-prefixed entry as ignored independently of configured rules. */
  ignoreHidden?: boolean;
};

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function comparisonKey(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLocaleLowerCase("en-US");
}

function globToRegExp(pattern: string, caseSensitive: boolean): RegExp {
  let normalized = normalizePath(pattern);
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${escaped}$`, caseSensitive ? "" : "i");
}

function hasGlob(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

function matchesDirectoryRule(
  relativePath: string,
  dirPattern: string,
  caseSensitive: boolean,
): boolean {
  if (hasGlob(dirPattern)) {
    const matcher = globToRegExp(dirPattern, caseSensitive);
    return relativePath.split("/").some((part) => matcher.test(part));
  }
  const pathKey = comparisonKey(relativePath, caseSensitive);
  const patternKey = comparisonKey(dirPattern, caseSensitive);
  return pathKey === patternKey
    || pathKey.startsWith(`${patternKey}/`)
    || pathKey.split("/").includes(patternKey);
}

/**
 * Normalize ignore rule lines without assigning any storage or Host semantics.
 * Blank lines and comments are removed. Negation rules are deliberately not
 * interpreted: the shared contract is the existing Phoenix ignore subset.
 */
export function pnwCodeNormalizeIgnorePatterns(
  patterns: readonly string[],
  options: PnwCodeIgnoreNormalizeOptions = {},
): string[] {
  const caseSensitive = options.caseSensitive !== false;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of patterns) {
    const pattern = String(raw ?? "").trim();
    if (!pattern || pattern.startsWith("#")) continue;
    if (options.dedupe) {
      const key = comparisonKey(pattern, caseSensitive);
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(pattern);
  }
  return result;
}

export function pnwCodeParseIgnoreText(
  text: string,
  options: PnwCodeIgnoreNormalizeOptions = {},
): string[] {
  return pnwCodeNormalizeIgnorePatterns(text.split(/\r?\n/), options);
}

/** Match a workspace-relative path against the shared Phoenix ignore subset. */
export function pnwCodeIsIgnoredPath(
  relativePath: string,
  patterns: readonly string[],
  options: PnwCodeIgnoreMatchOptions = {},
): boolean {
  if (patterns.length === 0) return false;
  const caseSensitive = options.caseSensitive !== false;
  const normalizedPath = normalizePath(relativePath);
  const base = normalizedPath.split("/").pop() ?? normalizedPath;
  const pathKey = comparisonKey(normalizedPath, caseSensitive);
  const baseKey = comparisonKey(base, caseSensitive);

  for (const raw of patterns) {
    const pattern = normalizePath(String(raw ?? "").trim());
    if (!pattern || pattern.startsWith("#")) continue;

    if (pattern.endsWith("/")) {
      if (matchesDirectoryRule(normalizedPath, pattern.slice(0, -1), caseSensitive)) return true;
      continue;
    }

    if (hasGlob(pattern)) {
      const matcher = globToRegExp(pattern, caseSensitive);
      if (matcher.test(normalizedPath) || matcher.test(base)) return true;
      continue;
    }

    const patternKey = comparisonKey(pattern, caseSensitive);
    if (pathKey === patternKey || pathKey.endsWith(`/${patternKey}`) || baseKey === patternKey) return true;
  }
  return false;
}

/** Match one directory entry while pruning a traversal. */
export function pnwCodeShouldSkipDirName(
  dirName: string,
  patterns: readonly string[],
  options: PnwCodeIgnoreMatchOptions = {},
): boolean {
  const caseSensitive = options.caseSensitive !== false;
  const nameKey = comparisonKey(normalizePath(dirName), caseSensitive);
  for (const raw of patterns) {
    const pattern = normalizePath(String(raw ?? "").trim());
    if (!pattern.endsWith("/")) continue;
    const directoryPattern = pattern.slice(0, -1);
    if (hasGlob(directoryPattern)) {
      if (globToRegExp(directoryPattern, caseSensitive).test(dirName)) return true;
      continue;
    }
    const patternKey = comparisonKey(directoryPattern, caseSensitive);
    if (nameKey === patternKey || patternKey.endsWith(`/${nameKey}`)) return true;
  }
  return false;
}

/** Match a single filesystem entry name, with optional hidden-entry policy. */
export function pnwCodeIsIgnoredName(
  name: string,
  patterns: readonly string[],
  options: PnwCodeIgnoreNameOptions = {},
): boolean {
  if (options.ignoreHidden && name.startsWith(".")) return true;
  return pnwCodeIsIgnoredPath(name, patterns, options);
}
