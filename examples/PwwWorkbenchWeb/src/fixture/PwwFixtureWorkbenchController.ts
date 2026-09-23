import { computed, markRaw, onScopeDispose, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  pnwNavigationLeaves,
  pnwCreateDiagnosticsHub,
  pnwViewBlockComponentAvailability,
  usePnwRegisteredViewContribution,
  type PnwBottomViewBlockComponentContribution,
  type PnwLogLevel,
  type PnwProblemInput,
  type PnwProblemItem,
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
import PwwFixtureViewBottom from "./PwwFixtureViewBottom.vue";
import { usePwwFixtureWorkbenchStore } from "./PwwFixtureWorkbenchStore.js";

/**
 * Fixture 宿主的状态与事件编排。
 *
 * 这里故意不进入 Wing：Tab 初始值、日志文案、设置入口和导航分组 CRUD 都是
 * 示例 consumer 的选择。App.vue 只负责把这些状态接到公开壳层。
 */
export function usePwwFixtureWorkbenchController() {
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
  const pwwNarrowPreview = ref(false);
  let pwwLogSequence = 1;
  const pwwDiagnosticsHub = pnwCreateDiagnosticsHub({
    maxLogEntries: 200,
    initialLogs: [{
      id: "fixture-log-0",
      timestamp: Date.now(),
      level: "info",
      channel: "pnw.workbench",
      source: "fixture",
      message: "同一导航树已加载，等待 Ribbon / Tree 呈现。",
    }],
  });
  const pwwDiagnosticsSnapshot = shallowRef(pwwDiagnosticsHub.getSnapshot());
  const pwwUnsubscribeDiagnostics = pwwDiagnosticsHub.subscribe((snapshot) => {
    pwwDiagnosticsSnapshot.value = snapshot;
  });
  onScopeDispose(pwwUnsubscribeDiagnostics);

  const pwwStore = usePwwFixtureWorkbenchStore();
  const {
    pwwActiveBottomTabId,
    pwwPresentation,
    pwwRibbonAppearance,
    pwwTreeCollapsed,
    pwwTreeAppearance,
    pwwTabBarPlacement,
    pwwColorScheme,
    pwwCustomTheme,
    pwwNavigationNodes,
    pwwWorkbenchLayoutState,
    pwwDisplaySettingsPositions,
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
  const pwwDefaultBottomProps = computed(() => ({
    title: "工作台消息",
    activeNodeId: pwwActiveNodeId.value,
    entries: pwwDiagnosticsSnapshot.value.logs,
    problems: pwwDiagnosticsSnapshot.value.problems,
    onClearLog: pwwClearDiagnosticsLog,
    onOpenProblem: pwwOpenProblem,
  }));
  const pwwDefaultBottomTabs = computed(() => [
    {
      id: "problems",
      label: "问题",
      count: pwwDiagnosticsSnapshot.value.problems.length,
      tone: pwwDiagnosticsSnapshot.value.problems.some((item) => item.severity === "error")
        ? "error" as const
        : pwwDiagnosticsSnapshot.value.problems.length > 0
          ? "warning" as const
          : "default" as const,
    },
    { id: "output", label: "工作台消息", count: pwwDiagnosticsSnapshot.value.logs.length },
  ]);
  const pwwDefaultBottomBlock: PnwBottomViewBlockComponentContribution = {
    component: markRaw(PwwFixtureViewBottom),
    props: pwwDefaultBottomProps,
    tabs: pwwDefaultBottomTabs,
  };
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
        primary: Boolean(contribution.primary)
          && pwwWorkbenchLayoutState.value.visibility.primary,
        // Bottom 是工作台默认能力；切换 View 只替换内容，不改受控显隐状态。
        bottom: pwwWorkbenchLayoutState.value.visibility.bottom,
        secondary: Boolean(contribution.secondary)
          && pwwWorkbenchLayoutState.value.visibility.secondary,
      },
    };
  });

  function pwwAppendEvent(
    message: string,
    level: PnwLogLevel = "info",
    channel = "fixture",
  ): void {
    pwwDiagnosticsHub.dispatch({
      type: "log.append",
      entry: {
        id: `fixture-log-${pwwLogSequence++}`,
        timestamp: Date.now(),
        level,
        channel,
        source: "Pww",
        message,
      },
    });
  }

  watch(pwwActiveNodeId, (nodeId) => {
    const items: readonly PnwProblemInput[] = nodeId === "validation"
      ? [
        {
          id: "fixture-navigation-empty",
          severity: "warning",
          message: "检测到一个空导航分组",
          source: "fixture",
          code: "navigation.empty-group",
          resource: "PwwFixtureNavigation.ts",
          line: 1,
        },
        {
          id: "fixture-host-route",
          severity: "info",
          message: "业务 Router 尚未连接",
          source: "fixture",
          code: "host.router.not-connected",
        },
      ]
      : [];
    pwwDiagnosticsHub.dispatch({
      type: "problems.replace",
      ownerId: "fixture.active-view",
      items,
    });
  }, { immediate: true });

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
    pwwAppendEvent(
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
    pwwAppendEvent(
      `宿主布局调整：${nodeId} 移入 ${targetRootId}；ID 与 View 语义未改变。`,
    );
  }

  function pwwCreateNavigationRoot(label: string, shortLabel?: string): void {
    pwwStore.pwwCreateNavigationRoot(label, shortLabel);
    pwwAppendEvent(`宿主新建空大分组：${label}；等待通过导航布局加入小模块。`);
  }

  function pwwDeleteNavigationRoot(rootId: string): void {
    pwwStore.pwwDeleteNavigationRoot(rootId);
    pwwAppendEvent(`宿主删除空的自定义大分组：${rootId}。`);
  }

  function pwwUpdateNavigationRoot(
    rootId: string,
    label: string,
    shortLabel: string | undefined,
    order: number,
  ): void {
    pwwStore.pwwUpdateNavigationRoot(rootId, label, shortLabel, order);
    pwwAppendEvent(`宿主更新大分组定义：${rootId}；稳定 ID 与小模块归属未改变。`);
  }

  function pwwRestoreNavigationRootDefinition(rootId: string): void {
    pwwStore.pwwRestoreNavigationRootDefinition(rootId);
    pwwAppendEvent(`宿主恢复内置大分组定义：${rootId}；不恢复小模块归属。`);
  }

  function pwwRestoreDefaultNavigation(): void {
    pwwStore.pwwRestoreDefaultNavigation();
    pwwAppendEvent("宿主恢复默认导航布局。");
  }

  function pwwOpenConsumerUserArea(): void {
    pwwAppendEvent("Header 右侧由 consumer 自定义；fixture 不实现真实用户或退出语义。");
  }

  function pwwHandleViewAction(actionId: string): void {
    if (actionId === "fixture.open-result-floating") {
      pwwActivateNode("result-preview");
      pwwAppendEvent(
        "openView：结果预览首次请求 floating；重复请求应聚焦既有实例。",
        "info",
        "presentation",
      );
      return;
    }
    pwwAppendEvent(`Consumer 处理 fixture View 动作：${actionId}。`);
  }

  function pwwHandleDisplaySettingsAction(actionId: string): void {
    if (actionId !== "fixture.log-display-state") {
      pwwAppendEvent(`Consumer 收到未知显示菜单动作：${actionId}。`, "warning");
      return;
    }
    const pwwModeAppearance = pwwRibbonAppearance.value[
      pwwRibbonAppearance.value.mode
    ];
    pwwAppendEvent([
      "Consumer 处理显示菜单动作",
      `呈现=${pwwPresentation.value}`,
      `模式=${pwwRibbonAppearance.value.mode}`,
      `图标=${pwwModeAppearance.iconSize}px`,
      `Title=${pwwModeAppearance.showTitles ? "开" : "关"}`,
      `主题=${pwwColorScheme.value}`,
      `树=${pwwTreeAppearance.value.expanded}/${pwwTreeAppearance.value.collapsed}`,
      `标签=${pwwTabBarPlacement.value}`,
    ].join("；"));
  }

  function pwwClearDiagnosticsLog(channel?: string): void {
    pwwDiagnosticsHub.dispatch({ type: "log.clear", ...(channel ? { channel } : {}) });
  }

  function pwwOpenProblem(item: PnwProblemItem): void {
    pwwAppendEvent(
      `Consumer 收到问题定位动作：${item.resource ?? item.id}${item.line ? `:${item.line}` : ""}。`,
      "info",
      "fixture.problem",
    );
  }

  return {
    appearance: {
      presentation: pwwPresentation,
      ribbon: pwwRibbonAppearance,
      activeRibbon: pwwActiveRibbonAppearance,
      tree: pwwTreeAppearance,
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
      tabBarPlacement: pwwTabBarPlacement,
    },
    settings: {
      narrowPreview: pwwNarrowPreview,
      displayPositions: pwwDisplaySettingsPositions,
    },
    view: {
      current: pwwCurrentView,
      blocks: pwwCurrentViewBlocks,
      defaultBottom: pwwDefaultBottomBlock,
      diagnostics: pwwDiagnosticsSnapshot,
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
      handleViewAction: pwwHandleViewAction,
      handleDisplaySettingsAction: pwwHandleDisplaySettingsAction,
      clearDiagnosticsLog: pwwClearDiagnosticsLog,
      openProblem: pwwOpenProblem,
    },
  };
}
