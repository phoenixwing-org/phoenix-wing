// phoenix-wing — Phoenix Wing 共享 TypeScript 工具库
// 纯逻辑 + Vue3 控件 + 算法

export const PNW_VERSION = '0.6.4'

// ---------------------------------------------------------------------------
// 异步任务进度
// ---------------------------------------------------------------------------
export {
  type PnwAsyncProgressStep,
  type PnwAsyncTaskState,
  type PnwTaskKind,
  type PnwTaskStatus,
  type PnwStepStatus,
  type PnwStepError,
  type PnwFileTimingRecord,
  PNW_SCAN_STEP_LABELS,
  PNW_TEST_STEP_LABEL,
} from './utils/pnwAsyncProgressTypes.js'

export {
  pnwCreateScanTaskState,
  pnwCreateTestTaskState,
  pnwComputeStepStatus,
  pnwComputeProgressPercent,
  pnwIsTerminal,
  pnwFilterActiveTasks,
  pnwSortTasksByTime,
  pnwHasRunningTasks,
  pnwAppendTaskLog,
  pnwUpdateTaskFromPoll,
  pnwUpdateTaskFromStreamEvent,
  pnwRecordFileTiming,
  pnwAverageFileDuration,
  pnwFastestFileDuration,
  pnwSlowestFileDuration,
  pnwEstimateRemaining,
  pnwFormatDuration,
  pnwFormatSeconds,
} from './utils/pnwAsyncProgress.js'

// ---------------------------------------------------------------------------
// 防抖调度
// ---------------------------------------------------------------------------
export { pnwScheduleDebounced } from './utils/pnwScheduleDebounced.js'

// ---------------------------------------------------------------------------
// 色彩方案
// ---------------------------------------------------------------------------
export {
  type PnwColorScheme,
  type PnwResolvedColorScheme,
  pnwResolveColorScheme,
  pnwGetAppliedColorScheme,
  pnwApplyColorScheme,
} from './utils/pnwColorScheme.js'

// ---------------------------------------------------------------------------
// 指针拖拽
// ---------------------------------------------------------------------------
export { pnwBindPointerDrag } from './utils/pnwPointerDrag.js'
export {
  pnwClampFloatingPanelPosition,
  pnwNormalizeFloatingPanelInsets,
  type PnwFloatingPanelInsets,
  type PnwFloatingPanelPosition,
  type PnwFloatingPanelSize,
} from './utils/pnwFloatingPanel.js'

// ---------------------------------------------------------------------------
// 常用 SVG 图标资源
// ---------------------------------------------------------------------------
export {
  PNW_ICON_NAMES,
  PNW_ICON_TEST_SIZES,
  pnwIsIconName,
  type PnwIconName,
  type PnwIconTestSize,
} from './icons/pnwIconCatalog.js'

export {
  type PnwBuiltinIconId,
  type PnwIconId,
} from './types/PnwIcon.js'

export {
  pnwBuiltinIconId,
  pnwCreateIconId,
  pnwIsIconId,
} from './utils/pnwIconId.js'

// ---------------------------------------------------------------------------
// 浏览器存储
// ---------------------------------------------------------------------------
export { pnwClearPhoenixBrowserStorage } from './utils/pnwBrowserStorage.js'

// ---------------------------------------------------------------------------
// 编辑抽屉宿主
// ---------------------------------------------------------------------------
export { pnwCanCloseEditorDrawer } from './utils/pnwEditorDrawer.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export { type PnwComboOption } from './types/pnwComboTypes.js'

export {
  type PnwLocale,
  type PnwLocaleMessageValues,
} from './types/PnwLocale.js'

export {
  PNW_DEFAULT_LOCALE,
  PNW_LOCALE_MESSAGES,
  pnwNormalizeLocale,
  pnwTranslateLocaleMessage,
  type PnwLocaleMessageKey,
  type PnwLocaleMessages,
} from './utils/pnwLocale.js'

export {
  PNW_WORKBENCH_OVERLAY_LAYERS,
  pnwResolveWorkbenchOverlayZIndex,
  type PnwWorkbenchOverlayLayer,
} from './utils/pnwOverlayStacking.js'

export {
  type PnwEditorDrawerMode,
  type PnwEditorDrawerSide,
  type PnwEditorDrawerIdentity,
  type PnwEditorDrawerCloseContext,
  type PnwEditorDrawerCloseGuard,
} from './types/PnwEditorDrawer.js'

export {
  type PnwPagePropertyScalar,
  type PnwPagePropertySelectOption,
  type PnwPagePropertySelectOptionsSource,
  type PnwPagePropertyFieldBase,
  type PnwPagePropertyBooleanField,
  type PnwPagePropertyStringField,
  type PnwPagePropertyNumberField,
  type PnwPagePropertySelectField,
  type PnwPagePropertyInfoField,
  type PnwPagePropertyPathField,
  type PnwPagePropertyField,
  type PnwPagePropertyGroup,
  type PnwPagePropertiesSheet,
} from './types/pnwPageProperties.js'

// ---------------------------------------------------------------------------
// 属性表 Schema 构建器
// ---------------------------------------------------------------------------
export {
  pnwPropGroup,
  pnwPropBool,
  pnwPropEnum,
  pnwPropRadio,
  pnwPropString,
  pnwPropNumber,
  pnwPropPath,
  pnwPropReadonly,
  pnwPropSheet,
} from './utils/pnwPagePropertySchema.js'

// ---------------------------------------------------------------------------
// Composables — 壳层框架
// ---------------------------------------------------------------------------
export {
  type PnwShellLayout,
  type PnwSideDock,
  type PnwSideDockVisibility,
  type PnwSideDockVisibilityContext,
  pnwGitCommitPanelDock,
  pnwSideDockVisibility,
} from './composables/pnwSideDockLayout.js'

export {
  type PnwTableColumnDef,
  usePnwResizableTable,
} from './composables/usePnwResizableTable.js'

export {
  PNW_DEFAULT_APP_TITLE,
  usePnwDocumentTitle,
} from './composables/usePnwDocumentTitle.js'

export {
  pnwSetPropertiesActivePage,
  pnwRegisterPageProperties,
  pnwUnregisterPageProperties,
  usePnwPagePropertiesHost,
} from './composables/pnwPagePropertiesHost.js'

export { usePnwPagePropertySheet } from './composables/usePnwPagePropertySheet.js'

// ---------------------------------------------------------------------------
// Ribbon 配置类型
// ---------------------------------------------------------------------------
export {
  PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION,
  pnwCheckRibbonContributionCompatibility,
  type PnwRibbonItemSize,
  type PnwRibbonItemDef,
  type PnwRibbonGroupDef,
  type PnwRibbonTabDef,
  type PnwRibbonContributionDocumentV1,
  type PnwRibbonContributionCompatibility,
} from './types/PnwRibbonConfig.js'

// ---------------------------------------------------------------------------
// Pnw Web 工作台实验契约（W4 双消费者验证前不冻结为版本化协议）
// ---------------------------------------------------------------------------
export {
  type PnwActivityBarPresentation,
  type PnwActivityTreeExpandedMode,
  type PnwActivityTreeCollapsedMode,
  type PnwActivityTreeAppearance,
  type PnwRibbonDisplayMode,
  type PnwRibbonIconSize,
  type PnwRibbonMode,
  type PnwRibbonModeAppearance,
  type PnwRibbonAppearance,
  type PnwNavigationNode,
  type PnwWorkbenchTabItem,
  type PnwWorkbenchTabBarPlacement,
  type PnwWorkbenchResponsiveState,
  type PnwBottomPanelTabTone,
  type PnwBottomPanelTab,
  type PnwViewBlockId,
  type PnwViewBlockContributions,
  type PnwViewBlockVisibility,
  type PnwWorkbenchPanelSizes,
  type PnwWorkbenchLayoutState,
  type PnwWorkbenchDisplaySettingsPositions,
  type PnwWorkbenchDisplayPreferences,
  type PnwWorkbenchLayoutViewport,
} from './types/PnwWorkbenchWeb.js'

export {
  type PnwViewBlockComponentContribution,
  type PnwBottomViewBlockComponentContribution,
  type PnwViewBlockComponentContributions,
  type PnwWorkbenchDisplaySettingsActionSlotProps,
  type PnwWorkbenchLayoutSlotProps,
} from './types/PnwWorkbenchVue.js'

export {
  type PnwLogLevel,
  type PnwLogEntry,
  type PnwLogFilter,
  type PnwProblemSeverity,
  type PnwProblemInput,
  type PnwProblemItem,
  type PnwProblemFilter,
  type PnwDiagnosticsSnapshot,
  type PnwDiagnosticsCommand,
  type PnwDiagnosticsListener,
  type PnwDiagnosticsHub,
  type PnwDiagnosticsHubOptions,
} from './types/PnwDiagnostics.js'

export {
  type PnwOutputSnapshot,
  type PnwOutputSignal,
  type PnwOutputListener,
  type PnwOutputBuffer,
  type PnwOutputBufferOptions,
} from './types/PnwOutput.js'

export {
  PNW_DEFAULT_DIAGNOSTICS_MAX_LOG_ENTRIES,
  PNW_DIAGNOSTICS_MAX_LOG_ENTRIES_LIMIT,
  pnwCreateDiagnosticsHub,
  pnwFilterLogEntries,
  pnwFilterProblemItems,
  pnwDiagnosticsLogChannels,
} from './utils/pnwDiagnostics.js'

export {
  PNW_DEFAULT_OUTPUT_MAX_CHARACTERS,
  PNW_OUTPUT_MAX_CHARACTERS_LIMIT,
  pnwCreateOutputBuffer,
} from './utils/pnwOutput.js'

export {
  type PnwViewContributionRegistry,
  type PnwViewContributionRegistration,
  pnwCreateViewContributionRegistry,
  pnwCreateViewContributionRegistration,
  usePnwViewContribution,
  usePnwRegisteredViewContribution,
} from './composables/usePnwViewContribution.js'

export {
  pnwViewBlockComponentAvailability,
  pnwResolveBottomViewBlockComponent,
  pnwResolveViewBlockComponentProps,
  pnwResolveBottomViewBlockTabs,
} from './composables/pnwViewBlockComponents.js'

// ---------------------------------------------------------------------------
// 工作台 Tab 管理
// ---------------------------------------------------------------------------
export {
  type PnwWorkbenchTabPayload,
  type PnwWorkbenchTab,
  type PnwWorkbenchSessionTab,
  type PnwWorkbenchSessionSnapshot,
  type PnwOpenTabOptions,
  type PnwPageTabPolicy,
  type PnwWorkbenchConfig,
  type PnwWorkbenchContext,
  pnwCreateWorkbench,
} from './composables/pnwCreateWorkbench.js'

// ---------------------------------------------------------------------------
// Ribbon 图标 & Tab 切换
// ---------------------------------------------------------------------------
export { pnwRegisterRibbonIcons, pnwRibbonIconFor } from './composables/pnwRibbonIcons.js'
export {
  pnwRegisterIconNamespace,
  pnwResolveIcon,
  type PnwIconNamespaceEntry,
  type PnwIconNamespaceMap,
  type PnwResolvedIcon,
} from './composables/pnwIconRegistry.js'
export { usePnwRibbonTabs } from './composables/usePnwRibbonTabs.js'
export {
  pnwProvideLocale,
  usePnwLocale,
  type PnwLocaleContext,
} from './composables/usePnwLocale.js'

export {
  pnwNavigationFromRibbonTabs,
  pnwVisibleNavigationNodes,
  pnwFlattenNavigationTree,
  pnwNavigationLeaves,
  pnwNavigationLeafIds,
  pnwNavigationNodeContains,
  pnwProjectNavigationRibbon,
  type PnwNavigationTreeRow,
  type PnwNavigationRibbonGroup,
  type PnwNavigationRibbonModule,
  type PnwRibbonNavigationAdapterOptions,
} from './utils/pnwNavigationTree.js'

export {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  PNW_WORKBENCH_NARROW_BREAKPOINT,
  PNW_DEFAULT_RIBBON_APPEARANCE,
  PNW_WORKBENCH_PANEL_SIZE_LIMITS,
  PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
  PNW_DEFAULT_WORKBENCH_DISPLAY_SETTINGS_POSITIONS,
  PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES,
  PNW_DEFAULT_WORKBENCH_LAYOUT_STATE,
  PNW_VIEW_BLOCK_IDS,
  pnwRibbonIconSizesFor,
  pnwResolveRibbonNaturalHeight,
  pnwValidateRibbonAppearance,
  pnwNextRibbonFocusIndex,
  pnwAvailableViewBlockIds,
  pnwResolveViewBlockVisibility,
  pnwToggleViewBlockVisibility,
  pnwResolveWorkbenchLayoutState,
  pnwResizeWorkbenchLayoutState,
  pnwResolveWorkbenchResponsiveState,
  pnwNormalizeWorkbenchTabBarPlacement,
  pnwNormalizeWorkbenchDisplayPreferences,
  pnwShouldRestoreEditorFromKeyboard,
  type PnwRibbonAppearanceIssueCode,
  type PnwRibbonAppearanceValidation,
} from './utils/pnwWorkbenchWeb.js'

// ---------------------------------------------------------------------------
// URL 同步
// ---------------------------------------------------------------------------
export {
  type PnwUrlSyncTab,
  type PnwShellUrlIntent,
  type PnwUrlParser,
  pnwRegisterUrlParser,
  pnwParseShellUrl,
  pnwBuildShellSearchParams,
  pnwReplaceShellUrl,
} from './composables/pnwShellUrlSync.js'

// ---------------------------------------------------------------------------
// Pinia stores
// ---------------------------------------------------------------------------
export { usePnwAsyncTaskStore } from './stores/pnwAsyncTasks.js'

// ---------------------------------------------------------------------------
// Vue3 Composables
// ---------------------------------------------------------------------------
export {
  type PnwChoiceDialogOption,
  type PnwChoiceDialogCheckboxItem,
  type PnwChoiceDialogCheckboxes,
  type PnwChoiceDialogRequest,
  type PnwChoiceDialogResult,
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwPromptChoice,
  pnwResolveChoice,
  pnwAlert,
  pnwPromptInput,
} from './composables/pnwChoiceDialog.js'
export { usePnwOverlayTheme } from './composables/usePnwOverlayTheme.js'

// ---------------------------------------------------------------------------
// Vue3 组件 — 根入口与兼容子路径均解析到同一 dist 模块图
// ---------------------------------------------------------------------------
export { default as PnwAppModalOverlay } from './components/PnwAppModalOverlay.vue'
export { default as PnwAsyncProgressOverlay } from './components/PnwAsyncProgressOverlay.vue'
export { default as PnwChoiceDialogHost } from './components/PnwChoiceDialogHost.vue'
export { default as PnwComboTextInput } from './components/PnwComboTextInput.vue'
export { default as PnwDictSelect } from './components/PnwDictSelect.vue'
export { default as PnwEditorDrawerHost } from './components/PnwEditorDrawerHost.vue'
export { default as PnwExpandCaret } from './components/PnwExpandCaret.vue'
export { default as PnwFloatingPanel } from './components/PnwFloatingPanel.vue'
export { default as PnwIcon } from './components/PnwIcon.vue'
export { default as PnwIconRenderer } from './components/PnwIconRenderer.vue'
export { default as PnwOverlayThemeProvider } from './components/PnwOverlayThemeProvider.vue'
export { default as PnwPhoenixWingMark } from './components/PnwPhoenixWingMark.vue'

export { default as PnwPageHeader } from './layout/PnwPageHeader.vue'
export { default as PnwPageLayout } from './layout/PnwPageLayout.vue'
export { default as PnwPageMainBlock } from './layout/PnwPageMainBlock.vue'
export { default as PnwActivityBar } from './layout/PnwActivityBar.vue'
export { default as PnwActivityTree } from './layout/PnwActivityTree.vue'
export { default as PnwBottomPanel } from './layout/PnwBottomPanel.vue'
export { default as PnwLogBlock } from './layout/PnwLogBlock.vue'
export { default as PnwOutputBlock } from './layout/PnwOutputBlock.vue'
export { default as PnwProblemsBlock } from './layout/PnwProblemsBlock.vue'
export { default as PnwPrimaryBlock } from './layout/PnwPrimaryBlock.vue'
export { default as PnwPrimaryPanel } from './layout/PnwPrimaryPanel.vue'
export { default as PnwPrimarySection } from './layout/PnwPrimarySection.vue'
export { default as PnwRibbon } from './layout/PnwRibbon.vue'
export { default as PnwRibbonGroup } from './layout/PnwRibbonGroup.vue'
export { default as PnwRibbonShell } from './layout/PnwRibbonShell.vue'
export { default as PnwRibbonTabBar } from './layout/PnwRibbonTabBar.vue'
export { default as PnwRibbonToolButton } from './layout/PnwRibbonToolButton.vue'
export { default as PnwRibbonUtilButton } from './layout/PnwRibbonUtilButton.vue'
export { default as PnwSecondaryBlock } from './layout/PnwSecondaryBlock.vue'
export { default as PnwShellLogPanel } from './layout/PnwShellLogPanel.vue'
export { default as PnwSidebarBlock } from './layout/PnwSidebarBlock.vue'
export { default as PnwSidebarBlockHead } from './layout/PnwSidebarBlockHead.vue'
export { default as PnwWelcomeShell } from './layout/PnwWelcomeShell.vue'
export { default as PnwWorkbenchTabBar } from './layout/PnwWorkbenchTabBar.vue'
export { default as PnwWorkbenchFooter } from './layout/PnwWorkbenchFooter.vue'
export { default as PnwWorkbenchHeader } from './layout/PnwWorkbenchHeader.vue'
export { default as PnwWorkbenchDisplaySettingsPanel } from './layout/PnwWorkbenchDisplaySettingsPanel.vue'
export { default as PnwWorkbenchDisplaySettingsSection } from './layout/PnwWorkbenchDisplaySettingsSection.vue'
export { default as PnwWorkbenchShell } from './layout/PnwWorkbenchShell.vue'
export { default as PnwWorkbenchLayout } from './layout/PnwWorkbenchLayout.vue'

// 0.4.x 兼容子路径（同样解析到编译后的 dist JS）:
//   import PnwSidebarBlock from 'phoenix-wing/layout/PnwSidebarBlock.vue'
//   import PnwSidebarBlockHead from 'phoenix-wing/layout/PnwSidebarBlockHead.vue'
//   import PnwRibbonShell from 'phoenix-wing/layout/PnwRibbonShell.vue'
//   import PnwRibbonTabBar from 'phoenix-wing/layout/PnwRibbonTabBar.vue'
//   import PnwRibbonGroup from 'phoenix-wing/layout/PnwRibbonGroup.vue'
//   import PnwRibbonToolButton from 'phoenix-wing/layout/PnwRibbonToolButton.vue'
//   import PnwRibbonUtilButton from 'phoenix-wing/layout/PnwRibbonUtilButton.vue'
//   import PnwPageHeader from 'phoenix-wing/layout/PnwPageHeader.vue'
//   import PnwPageLayout from 'phoenix-wing/layout/PnwPageLayout.vue'
//   import PnwPageMainBlock from 'phoenix-wing/layout/PnwPageMainBlock.vue'
//   import PnwShellLogPanel from 'phoenix-wing/layout/PnwShellLogPanel.vue'
//   import PnwWorkbenchTabBar from 'phoenix-wing/layout/PnwWorkbenchTabBar.vue'
//   import PnwWelcomeShell from 'phoenix-wing/layout/PnwWelcomeShell.vue'
//   import PnwAppModalOverlay from 'phoenix-wing/components/PnwAppModalOverlay.vue'
//   import PnwChoiceDialogHost from 'phoenix-wing/components/PnwChoiceDialogHost.vue'
//   import PnwComboTextInput from 'phoenix-wing/components/PnwComboTextInput.vue'
//   import PnwEditorDrawerHost from 'phoenix-wing/components/PnwEditorDrawerHost.vue'
//   import PnwExpandCaret from 'phoenix-wing/components/PnwExpandCaret.vue'
//   import PnwIcon from 'phoenix-wing/components/PnwIcon.vue'
//   import PnwAsyncProgressOverlay from 'phoenix-wing/components/PnwAsyncProgressOverlay.vue'
//   import PnwPhoenixWingMark from 'phoenix-wing/components/PnwPhoenixWingMark.vue'
