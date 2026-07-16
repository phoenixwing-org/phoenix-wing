export type PnwWorkset = {
  readonly id: string;
  readonly label: string;
  readonly roots: readonly string[];
  readonly include: readonly string[];
  readonly exclude: readonly string[];
};

export type PnwWorksetDocument = { readonly version: 1; readonly worksets: readonly PnwWorkset[] };
export type PnwWorksetParseResult = { readonly valid: boolean; readonly document?: PnwWorksetDocument; readonly diagnostics: readonly string[] };

/** Parses `.phoenix/worksets.json` without touching a workspace or evaluating globs. */
export function pnwParseWorksetDocument(text: string): PnwWorksetParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { valid: false, diagnostics: ["工作集文件不是有效 JSON"] }; }
  if (!pnwIsRecord(raw) || raw.version !== 1 || !Array.isArray(raw.worksets)) return { valid: false, diagnostics: ["工作集文件必须包含 version: 1 和 worksets 数组"] };
  const diagnostics: string[] = [];
  const worksets: PnwWorkset[] = [];
  const ids = new Set<string>();
  raw.worksets.forEach((item, index) => {
    if (!pnwIsRecord(item)) { diagnostics.push(`工作集 #${index + 1} 必须是对象`); return; }
    const id = pnwText(item.id);
    const label = pnwText(item.label);
    const roots = pnwStringArray(item.roots);
    const include = pnwStringArray(item.include);
    const exclude = pnwStringArray(item.exclude);
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) diagnostics.push(`工作集 #${index + 1} 的 id 非法`);
    else if (ids.has(id)) diagnostics.push(`工作集 id 重复：${id}`);
    else ids.add(id);
    if (!label) diagnostics.push(`工作集 ${id || `#${index + 1}`} 缺少 label`);
    if (!roots.length) diagnostics.push(`工作集 ${id || `#${index + 1}`} 至少需要一个 roots`);
    if (!include.length) diagnostics.push(`工作集 ${id || `#${index + 1}`} 至少需要一个 include`);
    if (roots.some((root) => !pnwIsSafeWorkspacePath(root))) diagnostics.push(`工作集 ${id || `#${index + 1}`} 的 roots 不能越出工作区`);
    if (id && label && roots.length && include.length && roots.every(pnwIsSafeWorkspacePath)) worksets.push({ id, label, roots, include, exclude });
  });
  return diagnostics.length ? { valid: false, diagnostics } : { valid: true, document: { version: 1, worksets }, diagnostics: [] };
}

export function pnwIsSafeWorkspacePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  return Boolean(normalized) && !normalized.startsWith("/") && !/^[a-z]:\//i.test(normalized) && !normalized.split("/").includes("..");
}

function pnwIsRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function pnwText(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function pnwStringArray(value: unknown): readonly string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : []; }
