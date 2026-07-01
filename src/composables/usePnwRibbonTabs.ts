import { computed, ref, watch, type Ref } from "vue";
import type { PnwRibbonTabDef } from "../types/PnwRibbonConfig.js";

export function usePnwRibbonTabs(options: {
  /** 所有 Tab 定义 */
  tabs: Ref<PnwRibbonTabDef[]>;
  /** 壳层常驻 Tab ID，消费项目指定哪个是"系统" Tab */
  shellTabId?: string;
  /** 当前激活页 ID */
  currentPage: Ref<string>;
  /** 已启用的模块列表（与 module 字段联动过滤） */
  enabledModules?: Ref<string[]>;
  /** 当前页属于壳层 Tab 的 pageId 集合 */
  shellPageIds?: string[];
  /** 工作台空闲页 pageId */
  idlePageId?: string;
  /** pageId → module 映射（从 navigation 提取） */
  pageModule?: (pageId: string) => string | undefined;
}) {
  const shellTabId = options.shellTabId ?? "system";

  const activeTab = ref(shellTabId);

  const visibleTabs = computed(() =>
    options.tabs.value.filter((tab) => {
      if (!tab.module) return true;
      if (!options.enabledModules) return true;
      return options.enabledModules.value.includes(tab.module);
    }),
  );

  function tabForModule(mod: string): PnwRibbonTabDef | undefined {
    return visibleTabs.value.find((t) => t.module === mod);
  }

  watch(
    visibleTabs,
    (tabs) => {
      if (!tabs.some((t) => t.id === activeTab.value)) {
        activeTab.value = tabs[0]?.id ?? shellTabId;
      }
    },
    { immediate: true },
  );

  const activeTabDef = computed(
    () => visibleTabs.value.find((t) => t.id === activeTab.value) ?? visibleTabs.value[0],
  );

  watch(
    options.currentPage,
    (page) => {
      const shellIds = options.shellPageIds ?? ["welcome", "home", "config"];
      if (options.idlePageId && page === options.idlePageId) {
        // idle page — keep current tab
        return;
      }
      if (shellIds.includes(page)) {
        activeTab.value = shellTabId;
        return;
      }
      if (options.pageModule) {
        const mod = options.pageModule(page);
        if (mod) {
          const tab = tabForModule(mod);
          if (tab) activeTab.value = tab.id;
        }
      }
    },
    { immediate: true },
  );

  return { activeTab, visibleTabs, activeTabDef };
}
