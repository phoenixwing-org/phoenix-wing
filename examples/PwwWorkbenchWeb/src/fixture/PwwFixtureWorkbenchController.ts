import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  pnwNavigationLeaves,
  pnwViewBlockComponentAvailability,
  usePnwRegisteredViewContribution,
  type PnwActivityBarPresentation,
  type PnwColorScheme,
  type PnwRibbonAppearance,
  type PnwWorkbenchTabItem,
} from "phoenix-wing";
import {
  PWW_FIXTURE_FALLBACK_VIEW,
  PWW_FIXTURE_VIEWS,
} from "./PwwFixtureViewDefinitions.js";
import {
  PWW_FIXTURE_EMPTY_VIEW_BLOCKS,
  PWW_FIXTURE_VIEW_BLOCK_REGISTRY,
} from "./PwwFixtureViewBlockRegistry.js";
import { usePwwFixtureWorkbenchStore } from "./PwwFixtureWorkbenchStore.js";

/**
 * Fixture 宿主的状态与事件编排。
 *
 * 这里故意不进入 Wing：Tab 初始值、日志文案、设置入口和导航分组 CRUD 都是
 * 示例 consumer 的选择。App.vue 只负责把这些状态接到公开壳层。
 */
export function usePwwFixtureWorkbenchController() {
  const pwwPresentation = ref<PnwActivityBarPresentation>("ribbon");
  const pwwActiveNodeId = ref("dashboard");
  const pwwExpandedNodeIds = ref<readonly string[]>([
    "workspace",
    "workspace-overview",
    "workspace-data",
    "development",
    "development-code",
    "collaboration",
    "collaboration-issues",
    "system",
    "system-workbench",
  ]);
  const pwwTreeCollapsed = ref(false);
  const pwwRibbonAppearance = ref<PnwRibbonAppearance>({
    mode: "ribbon",
    compact: {
      iconSize: 24,
      showTitles: true,
      showGroupLabels: false,
    },
    ribbon: {
      iconSize: 36,
      showTitles: true,
      showGroupLabels: true,
    },
  });
  const pwwColorScheme = ref<PnwColorScheme>("light");
  const pwwCustomTheme = ref(false);
  const pwwNarrowPreview = ref(false);
  const pwwEventLog = ref<string[]>([
    "Fixture 已加载：同一导航树等待 Ribbon / Tree 呈现。",
  ]);

  const pwwStore = usePwwFixtureWorkbenchStore();
  const {
    pwwActiveBottomTabId,
    pwwNavigationNodes,
    pwwWorkbenchLayoutState,
  } = storeToRefs(pwwStore);

  const pwwCurrentView = computed(() => PWW_FIXTURE_VIEWS[pwwActiveNodeId.value]
    ?? PWW_FIXTURE_FALLBACK_VIEW);
  const pwwCurrentViewBlocks = usePnwRegisteredViewContribution(
    PWW_FIXTURE_VIEW_BLOCK_REGISTRY,
    pwwActiveNodeId,
    PWW_FIXTURE_EMPTY_VIEW_BLOCKS,
  );
  const pwwCurrentContributions = computed(() => (
    pnwViewBlockComponentAvailability(pwwCurrentViewBlocks.value)
  ));
  const pwwActiveRibbonAppearance = computed(() => pwwRibbonAppearance.value[
    pwwRibbonAppearance.value.mode
  ]);

  const pwwOpenTabs = ref<PnwWorkbenchTabItem[]>([
    { id: "dashboard", pageId: "dashboard", title: "综合看板", dirty: false },
    { id: "models", pageId: "models", title: "模型目录", dirty: false },
    {
      id: "codegen",
      pageId: "codegen",
      title: "参数代码",
      dirty: true,
      subtitle: "fixture 未保存状态",
    },
  ]);
  const pwwActiveTabId = ref("dashboard");

  watch(pwwCurrentContributions, (contribution) => {
    pwwWorkbenchLayoutState.value = {
      ...pwwWorkbenchLayoutState.value,
      visibility: {
        primary: Boolean(contribution.primary),
        bottom: Boolean(contribution.bottom),
        secondary: Boolean(contribution.secondary),
      },
    };
  }, { immediate: true });

  function pwwPrependEvent(message: string): void {
    pwwEventLog.value = [message, ...pwwEventLog.value].slice(0, 6);
  }

  function pwwActivateNode(nodeId: string): void {
    pwwActiveNodeId.value = nodeId;
    const pwwView = PWW_FIXTURE_VIEWS[nodeId] ?? PWW_FIXTURE_FALLBACK_VIEW;
    if (!pwwOpenTabs.value.some((tab) => tab.id === nodeId)) {
      pwwOpenTabs.value.push({
        id: nodeId,
        pageId: nodeId,
        title: pwwView.title,
        dirty: false,
      });
    }
    pwwActiveTabId.value = nodeId;
    pwwPrependEvent(
      `激活 ${nodeId}；呈现=${pwwPresentation.value}；未触发 Router 或业务 API。`,
    );
  }

  function pwwActivateModule(moduleId: string): void {
    const pwwModuleNode = pwwNavigationNodes.value.find((node) => node.id === moduleId);
    const pwwLeaf = pwwModuleNode
      ? pnwNavigationLeaves([pwwModuleNode]).find((node) => !node.disabled)
      : undefined;
    if (pwwLeaf) pwwActivateNode(pwwLeaf.id);
  }

  function pwwSelectTab(tabId: string): void {
    const pwwTab = pwwOpenTabs.value.find((candidate) => candidate.id === tabId);
    if (pwwTab) pwwActivateNode(pwwTab.pageId);
  }

  function pwwCloseTab(tabId: string): void {
    const pwwIndex = pwwOpenTabs.value.findIndex((tab) => tab.id === tabId);
    if (pwwIndex < 0) return;
    const pwwWasActive = pwwActiveTabId.value === tabId;
    pwwOpenTabs.value.splice(pwwIndex, 1);
    if (!pwwWasActive) return;
    const pwwFallback = pwwOpenTabs.value[
      Math.min(pwwIndex, pwwOpenTabs.value.length - 1)
    ];
    pwwActiveTabId.value = pwwFallback?.id ?? "";
    if (pwwFallback) pwwActivateNode(pwwFallback.pageId);
    else pwwActiveNodeId.value = "";
  }

  function pwwCloseAllTabs(): void {
    pwwOpenTabs.value = [];
    pwwActiveTabId.value = "";
    pwwActiveNodeId.value = "";
  }

  function pwwMoveNavigationNode(nodeId: string, targetRootId: string): void {
    pwwStore.pwwMoveNavigationModule(nodeId, targetRootId);
    pwwPrependEvent(
      `宿主布局调整：${nodeId} 移入 ${targetRootId}；ID 与 View 语义未改变。`,
    );
  }

  function pwwCreateNavigationRoot(label: string, shortLabel?: string): void {
    pwwStore.pwwCreateNavigationRoot(label, shortLabel);
    pwwPrependEvent(`宿主新建空大分组：${label}；等待通过导航布局加入小模块。`);
  }

  function pwwDeleteNavigationRoot(rootId: string): void {
    pwwStore.pwwDeleteNavigationRoot(rootId);
    pwwPrependEvent(`宿主删除空的自定义大分组：${rootId}。`);
  }

  function pwwUpdateNavigationRoot(
    rootId: string,
    label: string,
    shortLabel: string | undefined,
    order: number,
  ): void {
    pwwStore.pwwUpdateNavigationRoot(rootId, label, shortLabel, order);
    pwwPrependEvent(`宿主更新大分组定义：${rootId}；稳定 ID 与小模块归属未改变。`);
  }

  function pwwRestoreNavigationRootDefinition(rootId: string): void {
    pwwStore.pwwRestoreNavigationRootDefinition(rootId);
    pwwPrependEvent(`宿主恢复内置大分组定义：${rootId}；不恢复小模块归属。`);
  }

  function pwwRestoreDefaultNavigation(): void {
    pwwStore.pwwRestoreDefaultNavigation();
    pwwPrependEvent("宿主恢复默认导航布局。");
  }

  function pwwOpenConsumerUserArea(): void {
    pwwPrependEvent("Header 右侧由 consumer 自定义；fixture 不实现真实用户或退出语义。");
  }

  function pwwHandleDisplaySettingsAction(actionId: string): void {
    if (actionId !== "fixture.log-display-state") {
      pwwPrependEvent(`Consumer 收到未知显示菜单动作：${actionId}。`);
      return;
    }
    const pwwModeAppearance = pwwRibbonAppearance.value[
      pwwRibbonAppearance.value.mode
    ];
    pwwPrependEvent([
      "Consumer 处理显示菜单动作",
      `呈现=${pwwPresentation.value}`,
      `模式=${pwwRibbonAppearance.value.mode}`,
      `图标=${pwwModeAppearance.iconSize}px`,
      `Title=${pwwModeAppearance.showTitles ? "开" : "关"}`,
      `主题=${pwwColorScheme.value}`,
    ].join("；"));
  }

  return {
    appearance: {
      presentation: pwwPresentation,
      ribbon: pwwRibbonAppearance,
      activeRibbon: pwwActiveRibbonAppearance,
      colorScheme: pwwColorScheme,
      customTheme: pwwCustomTheme,
    },
    navigation: {
      activeNodeId: pwwActiveNodeId,
      expandedNodeIds: pwwExpandedNodeIds,
      treeCollapsed: pwwTreeCollapsed,
      nodes: pwwNavigationNodes,
    },
    layout: {
      state: pwwWorkbenchLayoutState,
      activeBottomTabId: pwwActiveBottomTabId,
    },
    settings: {
      narrowPreview: pwwNarrowPreview,
    },
    view: {
      current: pwwCurrentView,
      blocks: pwwCurrentViewBlocks,
      eventLog: pwwEventLog,
    },
    tabs: {
      items: pwwOpenTabs,
      activeId: pwwActiveTabId,
    },
    actions: {
      activateNode: pwwActivateNode,
      activateModule: pwwActivateModule,
      selectTab: pwwSelectTab,
      closeTab: pwwCloseTab,
      closeAllTabs: pwwCloseAllTabs,
      moveNavigationNode: pwwMoveNavigationNode,
      createNavigationRoot: pwwCreateNavigationRoot,
      deleteNavigationRoot: pwwDeleteNavigationRoot,
      updateNavigationRoot: pwwUpdateNavigationRoot,
      restoreNavigationRootDefinition: pwwRestoreNavigationRootDefinition,
      restoreDefaultNavigation: pwwRestoreDefaultNavigation,
      openConsumerUserArea: pwwOpenConsumerUserArea,
      handleDisplaySettingsAction: pwwHandleDisplaySettingsAction,
    },
  };
}
