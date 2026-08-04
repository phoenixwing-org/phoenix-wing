export type PnwColorScheme = "light" | "dark" | "system";
export type PnwResolvedColorScheme = Exclude<PnwColorScheme, "system">;

type PnwAppliedColorSchemeListener = (scheme: PnwResolvedColorScheme) => void;

const pnwAppliedColorSchemeListeners = new Set<PnwAppliedColorSchemeListener>();
let pnwAppliedColorScheme: PnwResolvedColorScheme | undefined;

export function pnwResolveColorScheme(scheme: PnwColorScheme): PnwResolvedColorScheme {
  if (scheme === "system") {
    return typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return scheme;
}

/**
 * 返回 Host 最近通过 pnwApplyColorScheme 应用的解析结果。
 * 未应用时从 document 根标记或系统偏好推导，SSR 缺省为 light。
 */
export function pnwGetAppliedColorScheme(): PnwResolvedColorScheme {
  if (pnwAppliedColorScheme) return pnwAppliedColorScheme;
  if (typeof document !== "undefined") {
    const rootScheme = document.documentElement.dataset.pnwColorScheme;
    if (rootScheme === "light" || rootScheme === "dark") return rootScheme;
    const legacyTheme = document.documentElement.dataset.theme;
    if (legacyTheme === "light" || legacyTheme === "dark") return legacyTheme;
  }
  return pnwResolveColorScheme("system");
}

/** Wing overlay Host 内部订阅；返回解除订阅函数。 */
export function pnwOnAppliedColorSchemeChange(
  listener: PnwAppliedColorSchemeListener,
): () => void {
  pnwAppliedColorSchemeListeners.add(listener);
  return () => pnwAppliedColorSchemeListeners.delete(listener);
}

/**
 * 应用解析后的 Wing 主题根标记，并通知 Teleport overlay theme roots。
 * Element Plus 的 html.dark 与 --el-* 仍由 Host adapter 同步。
 */
export function pnwApplyColorScheme(scheme: PnwColorScheme): PnwResolvedColorScheme {
  const resolved = pnwResolveColorScheme(scheme);
  pnwAppliedColorScheme = resolved;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.pnwColorScheme = resolved;
  }
  for (const listener of pnwAppliedColorSchemeListeners) listener(resolved);
  return resolved;
}
