import { computed, ref } from "vue";

export type {
  PnwWorkbenchTabPayload,
  PnwWorkbenchTab,
  PnwWorkbenchSessionTab,
  PnwWorkbenchSessionSnapshot,
  PnwOpenTabOptions,
  PnwPageTabPolicy,
} from "../types/PnwWorkbench.js";

import type {
  PnwOpenTabOptions,
  PnwPageTabPolicy,
  PnwWorkbenchSessionSnapshot,
  PnwWorkbenchTab,
  PnwWorkbenchTabPayload,
} from "../types/PnwWorkbench.js";

let tabSeq = 0;

function newTabId(): string {
  tabSeq += 1;
  return `tab-${Date.now()}-${tabSeq}`;
}

/** 消费项目提供的工作台配置 */
export interface PnwWorkbenchConfig {
  /** pageId → 策略（maxTabs, tabEnabled） */
  pagePolicy: (pageId: string) => PnwPageTabPolicy;
  /** pageId → 显示名称（fallback） */
  navLabel: (pageId: string) => string;
  /** 不落盘、不参与 session 恢复的 pageId 集合 */
  ephemeralPages?: Set<string>;
  /** session 恢复时 pageId 重映射（如旧版本兼容） */
  remapPageId?: (pageId: string, title: string) => string;
  /** 脏页关闭确认回调 */
  onDirtyClose?: (title: string, canFlush: boolean) => Promise<"flush" | "discard" | "cancel">;
  /** 关闭全部确认回调 */
  onCloseAll?: (count: number, dirtyTitles: string[]) => Promise<boolean>;
  /** 页级 session API */
  getPageSession?: (tabId: string) => { isDirty: () => boolean; flush?: () => Promise<boolean> } | undefined;
}

export function pnwCreateWorkbench(config: PnwWorkbenchConfig) {
  const tabs = ref<PnwWorkbenchTab[]>([]);
  const activeTabId = ref("");
  const ephemeralPages = config.ephemeralPages ?? new Set<string>();
  const getPageSession = config.getPageSession ?? (() => undefined);
  const onDirtyClose = config.onDirtyClose ?? (async () => "discard" as const);
  const onCloseAll = config.onCloseAll ?? (async () => true);

  function findTabsForPage(pageId: string): PnwWorkbenchTab[] {
    return tabs.value.filter((t) => t.pageId === pageId);
  }

  function getTab(tabId: string): PnwWorkbenchTab | undefined {
    return tabs.value.find((t) => t.id === tabId);
  }

  function activeTab(): PnwWorkbenchTab | undefined {
    return getTab(activeTabId.value);
  }

  const activePageId = computed(() => activeTab()?.pageId ?? "home");
  const tabBarTabs = computed(() => tabs.value.filter((t) => t.pageId !== "welcome"));
  const showTabBar = computed(() => tabBarTabs.value.length > 0);

  function applyPayload(tab: PnwWorkbenchTab, payload?: PnwWorkbenchTabPayload) {
    if (!payload) return;
    tab.payload = payload;
    tab.payloadConsumed = false;
  }

  function openTab(opts: PnwOpenTabOptions): string {
    const { pageId, title, subtitle, contextKey, payload, forceNew } = opts;
    if (pageId === "welcome") throw new Error("欢迎页不在 Tab 工作台中");
    const { maxTabs } = config.pagePolicy(pageId);
    const existing = findTabsForPage(pageId);

    if (!forceNew && maxTabs === 1 && existing.length) {
      const tab = existing[0];
      if (title) tab.title = title;
      if (subtitle !== undefined) tab.subtitle = subtitle;
      if (contextKey) tab.contextKey = contextKey;
      applyPayload(tab, payload);
      activeTabId.value = tab.id;
      return tab.id;
    }

    if (existing.length >= maxTabs) {
      throw new Error(`${config.navLabel(pageId)} 最多 ${maxTabs} 个 Tab，请先关闭部分 Tab`);
    }

    const tab: PnwWorkbenchTab = {
      id: newTabId(),
      pageId,
      title: title ?? config.navLabel(pageId),
      subtitle,
      contextKey,
      dirty: false,
      payload,
      payloadConsumed: false,
    };
    tabs.value.push(tab);
    activeTabId.value = tab.id;
    return tab.id;
  }

  function activateTab(tabId: string): void {
    if (getTab(tabId)) activeTabId.value = tabId;
  }

  function updateTab(tabId: string, patch: Partial<Pick<PnwWorkbenchTab, "title" | "subtitle" | "dirty">>): void {
    const tab = getTab(tabId);
    if (!tab) return;
    if (patch.title !== undefined) tab.title = patch.title;
    if (patch.subtitle !== undefined) tab.subtitle = patch.subtitle;
    if (patch.dirty !== undefined) tab.dirty = patch.dirty;
  }

  function canOpenNewTab(pageId: string): boolean {
    const { maxTabs, tabEnabled } = config.pagePolicy(pageId);
    if (!tabEnabled || maxTabs <= 1) return false;
    return findTabsForPage(pageId).length < maxTabs;
  }

  async function closeTab(tabId: string): Promise<boolean> {
    const idx = tabs.value.findIndex((t) => t.id === tabId);
    if (idx < 0) return false;
    const tab = tabs.value[idx];
    const api = getPageSession(tabId);
    const dirty = api?.isDirty() ?? tab.dirty;
    if (dirty) {
      const choice = await onDirtyClose(tab.title, Boolean(api?.flush));
      if (choice === "cancel") return false;
      if (choice === "flush" && api?.flush) {
        const ok = await api.flush();
        if (!ok) return false;
        tab.dirty = false;
      }
    }
    tabs.value.splice(idx, 1);
    if (activeTabId.value === tabId) {
      const next = tabs.value[idx] ?? tabs.value[idx - 1] ?? tabs.value[0];
      activeTabId.value = next?.id ?? "";
    }
    if (!tabs.value.length) activeTabId.value = "";
    return true;
  }

  async function closeAllTabs(): Promise<boolean> {
    const list = tabs.value;
    if (list.length <= 1) return false;
    const dirtyTitles: string[] = [];
    for (const tab of list) {
      const api = getPageSession(tab.id);
      if (api?.isDirty() ?? tab.dirty) dirtyTitles.push(tab.title);
    }
    if (!(await onCloseAll(list.length, dirtyTitles))) return false;
    tabs.value = [];
    activeTabId.value = "";
    return true;
  }

  function discardAllToolTabs(): void {
    tabs.value = [];
    activeTabId.value = "";
  }

  function consumeTabPayload(tabId: string): PnwWorkbenchTabPayload | undefined {
    const tab = getTab(tabId);
    if (!tab?.payload || tab.payloadConsumed) return undefined;
    tab.payloadConsumed = true;
    return tab.payload;
  }

  function consumeTabPageState(tabId: string): Record<string, unknown> | undefined {
    const tab = getTab(tabId);
    if (!tab?.pageState) return undefined;
    const state = tab.pageState;
    delete tab.pageState;
    return state;
  }

  function restoreSession(snapshot: PnwWorkbenchSessionSnapshot): boolean {
    if (snapshot.version !== 1 || !snapshot.tabs.length) return false;
    const remap = config.remapPageId ?? ((id) => id);
    const mapped = snapshot.tabs
      .map((t) => ({
        id: t.id,
        pageId: remap(t.pageId, t.title),
        title: t.title,
        subtitle: t.subtitle,
        contextKey: t.contextKey,
        dirty: false,
        payloadConsumed: true,
        pageState: t.pageState,
      }))
      .filter((t) => !ephemeralPages.has(t.pageId));
    if (!mapped.length) return false;
    tabs.value = mapped;
    const active = snapshot.activeTabId && getTab(snapshot.activeTabId);
    activeTabId.value = active ? snapshot.activeTabId : tabs.value[0].id;
    return true;
  }

  function exportSession(
    pageStates: Record<string, Record<string, unknown> | undefined>,
  ): PnwWorkbenchSessionSnapshot {
    const persistent = tabs.value.filter((t) => !ephemeralPages.has(t.pageId));
    let activeId = activeTabId.value;
    if (!persistent.some((t) => t.id === activeId)) {
      activeId = persistent[0]?.id ?? "";
    }
    return {
      version: 1,
      activeTabId: activeId,
      tabs: persistent.map((t) => ({
        id: t.id,
        pageId: t.pageId,
        title: t.title,
        subtitle: t.subtitle,
        contextKey: t.contextKey,
        pageState: pageStates[t.id],
      })),
    };
  }

  return {
    tabs, activeTabId, activePageId, tabBarTabs, showTabBar,
    getTab, activeTab, openTab, activateTab, updateTab,
    setTabDirty(tabId: string, dirty: boolean) { updateTab(tabId, { dirty }); },
    consumeTabPayload, consumeTabPageState,
    canOpenNewTab, closeTab, closeAllTabs,
    toolTabDirtyTitles() {
      return tabs.value.filter(t => t.pageId !== "home")
        .map(t => { const api = getPageSession(t.id); return api?.isDirty() ?? t.dirty ? t.title : null; })
        .filter(Boolean) as string[];
    },
    discardAllToolTabs,
    restoreSession, exportSession,
  };
}

export type PnwWorkbenchContext = ReturnType<typeof pnwCreateWorkbench>;
