/** 壳层 URL 同步 — 纯函数，零框架依赖。 */

/** 工作台 Tab 最小接口（消费项目提供实际类型） */
export interface PnwUrlSyncTab {
  pageId: string;
  contextKey?: string;
  subtitle?: string;
}

/** 从地址栏解析的壳层深链意图 */
export type PnwShellUrlIntent =
  | { kind: "welcome" }
  | { kind: "config" }
  | { kind: "page"; pageId: string; rel?: string; renameLogId?: number; analyze?: boolean };

/** 自定义 URL 参数解析器 */
export type PnwUrlParser = (
  params: URLSearchParams,
) => PnwShellUrlIntent | null;

let customParse: PnwUrlParser | null = null;

/** 注册自定义 URL 解析器（消费项目提供业务页面路由） */
export function pnwRegisterUrlParser(parser: PnwUrlParser): void {
  customParse = parser;
}

export function pnwParseShellUrl(search?: string): PnwShellUrlIntent | null {
  const s = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(s);
  if (params.get("view") === "welcome") return { kind: "welcome" };
  const page = params.get("page")?.trim();
  if (!page) return null;
  if (page === "welcome") return { kind: "welcome" };
  if (page === "config") return { kind: "config" };
  if (customParse) return customParse(params);
  const rel = params.get("rel")?.trim() || undefined;
  return { kind: "page", pageId: page, rel };
}

export function pnwBuildShellSearchParams(opts: {
  showWelcome: boolean;
  activeTab?: PnwUrlSyncTab;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (opts.showWelcome) {
    params.set("view", "welcome");
    return params;
  }
  const tab = opts.activeTab;
  if (!tab) return params;
  params.set("page", tab.pageId);
  const rel = (tab.contextKey || tab.subtitle || "").trim();
  if (rel) params.set("rel", rel);
  return params;
}

export function pnwReplaceShellUrl(opts: {
  showWelcome: boolean;
  activeTab?: PnwUrlSyncTab;
}): void {
  if (typeof window === "undefined") return;
  const params = pnwBuildShellSearchParams(opts);
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(null, "", next);
}
