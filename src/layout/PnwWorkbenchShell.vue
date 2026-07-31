<script setup lang="ts">
import { computed, useSlots, type Component } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwBottomViewBlockComponentContribution,
  PnwViewBlockComponentContributions,
  PnwWorkbenchDisplaySettingsActionSlotProps,
} from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwBottomPanelTab,
  PnwNavigationNode,
  PnwRibbonAppearance,
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
  PnwWorkbenchDisplaySettingsPositions,
  PnwWorkbenchTabItem,
  PnwWorkbenchTabBarPlacement,
  PnwWorkbenchLayoutState,
  PnwWorkbenchResponsiveState,
} from "../types/PnwWorkbenchWeb.js";
import {
  pnwNavigationNodeContains,
  pnwNormalizeNavigationVisibility,
  pnwVisibleNavigationNodes,
} from "../utils/pnwNavigationTree.js";
import {
  pnwResolveBottomViewBlockComponent,
  pnwResolveBottomViewBlockTabs,
  pnwResolveViewBlockComponentProps,
  pnwViewBlockComponentAvailability,
} from "../composables/pnwViewBlockComponents.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
} from "../utils/pnwWorkbenchWeb.js";
import PnwActivityBar from "./PnwActivityBar.vue";
import PnwPhoenixWingMark from "../components/PnwPhoenixWingMark.vue";
import PnwRibbonTabBar from "./PnwRibbonTabBar.vue";
import PnwWorkbenchHeader from "./PnwWorkbenchHeader.vue";
import PnwWorkbenchDisplaySettings from "./PnwWorkbenchDisplaySettings.vue";
import PnwWorkbenchLayout from "./PnwWorkbenchLayout.vue";
import PnwWorkbenchTabBar from "./PnwWorkbenchTabBar.vue";

const props = withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  presentation?: PnwActivityBarPresentation;
  activeNodeId?: string;
  expandedNodeIds?: readonly string[];
  ribbonAppearance?: PnwRibbonAppearance;
  treeCollapsed?: boolean;
  treeAppearance?: PnwActivityTreeAppearance;
  contributions?: PnwViewBlockContributions;
  viewBlocks?: PnwViewBlockComponentContributions;
  /** 应用级 Bottom；当前 View 未贡献 Bottom 时自动回退到这里。 */
  defaultBottomBlock?: PnwBottomViewBlockComponentContribution;
  visibility?: PnwViewBlockVisibility;
  layoutState?: PnwWorkbenchLayoutState;
  bottomTabs?: readonly PnwBottomPanelTab[];
  activeBottomTabId?: string;
  colorScheme?: PnwColorScheme;
  tabs?: readonly PnwWorkbenchTabItem[];
  tabBarPlacement?: PnwWorkbenchTabBarPlacement;
  activeTabId?: string;
  pageIcon?: (pageId: string) => Component | undefined;
  canAddTab?: boolean;
  canCloseAllTabs?: boolean;
  closingAllTabs?: boolean;
  showRibbonAppearanceMenu?: boolean;
  showAdvancedSettingsAction?: boolean;
  displaySettingsPositions?: PnwWorkbenchDisplaySettingsPositions;
  headerAriaLabel?: string;
  activityAriaLabel?: string;
  treeHeaderLabel?: string;
  brandTitle?: string;
  brandSubtitle?: string;
  showFooter?: boolean;
  showEmptyView?: boolean;
  emptyViewTitle?: string;
  emptyViewDescription?: string;
}>(), {
  presentation: "ribbon",
  activeNodeId: "",
  expandedNodeIds: () => [],
  ribbonAppearance: () => PNW_DEFAULT_RIBBON_APPEARANCE,
  treeCollapsed: false,
  treeAppearance: () => PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  contributions: () => ({}),
  viewBlocks: () => ({}),
  visibility: () => ({ primary: false, bottom: false, secondary: false }),
  bottomTabs: () => [],
  activeBottomTabId: "",
  colorScheme: "system",
  tabs: () => [],
  tabBarPlacement: PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  activeTabId: "",
  canAddTab: false,
  canCloseAllTabs: false,
  closingAllTabs: false,
  showRibbonAppearanceMenu: true,
  showAdvancedSettingsAction: false,
  headerAriaLabel: "工作台页眉",
  activityAriaLabel: "全局活动导航",
  treeHeaderLabel: "导航工具",
  brandTitle: "Pnw Workbench",
  brandSubtitle: "",
  showFooter: true,
  showEmptyView: false,
  emptyViewTitle: "未打开任何 View",
  emptyViewDescription: "请从导航中选择一个工具或页面。",
});

const emit = defineEmits<{
  activate: [nodeId: string];
  selectModule: [moduleId: string];
  selectTab: [tabId: string];
  closeTab: [tabId: string];
  closeAllTabs: [];
  newTab: [];
  toggleBlock: [blockId: PnwViewBlockId];
  selectBottomTab: [tabId: string];
  "update:expandedNodeIds": [nodeIds: readonly string[]];
  "update:presentation": [presentation: PnwActivityBarPresentation];
  "update:ribbonAppearance": [appearance: PnwRibbonAppearance];
  "update:colorScheme": [colorScheme: PnwColorScheme];
  displaySettingsAction: [actionId: string];
  openWorkbenchSettings: [];
  "update:treeCollapsed": [collapsed: boolean];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:visibility": [visibility: PnwViewBlockVisibility];
  "update:layoutState": [layoutState: PnwWorkbenchLayoutState];
  "update:activeBottomTabId": [tabId: string];
  "update:tabBarPlacement": [placement: PnwWorkbenchTabBarPlacement];
  "update:displaySettingsPositions": [positions: PnwWorkbenchDisplaySettingsPositions];
}>();

defineSlots<{
  default(): unknown;
  header(props: PnwWorkbenchResponsiveState): unknown;
  activity(props: PnwWorkbenchResponsiveState): unknown;
  "display-settings-actions"(
    props: PnwWorkbenchDisplaySettingsActionSlotProps,
  ): unknown;
  "display-settings-panel-extra"(): unknown;
  [name: string]: ((...args: any[]) => unknown) | undefined;
}>();

const pnwSlots = useSlots();
const pnwComponentAvailability = computed(() => pnwViewBlockComponentAvailability(
  props.viewBlocks,
  props.defaultBottomBlock,
));
const pnwResolvedBottomBlock = computed(() => pnwResolveBottomViewBlockComponent(
  props.viewBlocks.bottom,
  props.defaultBottomBlock,
));
const pnwResolvedContributions = computed<PnwViewBlockContributions>(() => ({
  primary: Boolean(props.contributions.primary || pnwComponentAvailability.value.primary),
  bottom: Boolean(props.contributions.bottom || pnwComponentAvailability.value.bottom),
  secondary: Boolean(props.contributions.secondary || pnwComponentAvailability.value.secondary),
}));
const pnwResolvedBottomTabs = computed(() => pnwResolveBottomViewBlockTabs(
  props.viewBlocks.bottom,
  props.defaultBottomBlock,
  props.bottomTabs,
));
const pnwNavigationNodes = computed(() => pnwNormalizeNavigationVisibility(props.nodes));
const pnwRootNodes = computed(() => pnwVisibleNavigationNodes(pnwNavigationNodes.value));
const pnwModuleTabs = computed(() => pnwRootNodes.value.map((node) => ({
  id: node.id,
  label: node.shortLabel ?? node.label,
  fullLabel: node.label,
})));
const pnwActiveModuleId = computed(() => pnwRootNodes.value.find(
  (node) => pnwNavigationNodeContains(node, props.activeNodeId),
)?.id ?? pnwRootNodes.value[0]?.id ?? "");
</script>

<template>
  <PnwWorkbenchLayout
    :activity-bar-presentation="presentation"
    :contributions="pnwResolvedContributions"
    :visibility="visibility"
    :layout-state="layoutState"
    :bottom-tabs="pnwResolvedBottomTabs"
    :active-bottom-tab-id="activeBottomTabId"
    :color-scheme="colorScheme"
    :tab-bar-placement="tabBarPlacement"
    :show-footer="showFooter"
    @update:visibility="emit('update:visibility', $event)"
    @update:layout-state="emit('update:layoutState', $event)"
    @update:active-bottom-tab-id="emit('update:activeBottomTabId', $event)"
    @select-bottom-tab="emit('selectBottomTab', $event)"
    @toggle="emit('toggleBlock', $event)"
  >
    <template #header="pnwResponsiveState">
      <slot name="header" v-bind="pnwResponsiveState">
        <PnwWorkbenchHeader
          :aria-label="headerAriaLabel"
          :show-pages="pnwResponsiveState.effectiveTabBarPlacement === 'header'
            && (tabs.length > 0 || Boolean(pnwSlots.pages))"
        >
          <template #brand>
            <slot name="brand">
              <div class="pnw-workbench-default-brand">
                <PnwPhoenixWingMark class="pnw-workbench-default-brand-mark" decorative />
                <div class="pnw-workbench-default-brand-copy">
                  <strong>{{ brandTitle }}</strong>
                  <span v-if="brandSubtitle">{{ brandSubtitle }}</span>
                </div>
              </div>
            </slot>
          </template>
          <template
            v-if="pnwResponsiveState.effectivePresentation === 'ribbon'"
            #modules
          >
            <slot
              name="modules"
              :tabs="pnwModuleTabs"
              :active-module-id="pnwActiveModuleId"
            >
              <PnwRibbonTabBar
                :tabs="pnwModuleTabs"
                :active-tab="pnwActiveModuleId"
                @update:active-tab="emit('selectModule', $event)"
              />
            </slot>
          </template>
          <template
            v-if="pnwResponsiveState.effectiveTabBarPlacement === 'header'
              && (tabs.length > 0 || pnwSlots.pages)"
            #pages
          >
            <slot name="pages">
              <PnwWorkbenchTabBar
                :tabs="tabs"
                :active-tab-id="activeTabId"
                :page-icon="pageIcon"
                :can-add="canAddTab"
                :can-close-all="canCloseAllTabs"
                :closing-all="closingAllTabs"
                in-header
                @select="emit('selectTab', $event)"
                @close="emit('closeTab', $event)"
                @close-all="emit('closeAllTabs')"
                @new-tab="emit('newTab')"
              />
            </slot>
          </template>
          <template v-if="pnwSlots['header-actions']" #actions>
            <slot name="header-actions" />
          </template>
        </PnwWorkbenchHeader>
      </slot>
    </template>

    <template
      v-if="tabs.length > 0 || pnwSlots.pages"
      #view-tabs
    >
      <slot name="pages">
        <PnwWorkbenchTabBar
          :tabs="tabs"
          :active-tab-id="activeTabId"
          :page-icon="pageIcon"
          :can-add="canAddTab"
          :can-close-all="canCloseAllTabs"
          :closing-all="closingAllTabs"
          @select="emit('selectTab', $event)"
          @close="emit('closeTab', $event)"
          @close-all="emit('closeAllTabs')"
          @new-tab="emit('newTab')"
        />
      </slot>
    </template>

    <template #activity="pnwResponsiveState">
      <slot name="activity" v-bind="pnwResponsiveState">
        <div
          class="pnw-workbench-activity-frame"
          :class="`pnw-workbench-activity-frame--${pnwResponsiveState.effectivePresentation}`"
        >
          <PnwActivityBar
            :nodes="pnwNavigationNodes"
            :presentation="pnwResponsiveState.effectivePresentation"
            :active-node-id="activeNodeId"
            :expanded-node-ids="expandedNodeIds"
            :appearance="ribbonAppearance"
            :color-scheme="colorScheme"
            :tree-collapsed="treeCollapsed"
            :tree-appearance="treeAppearance"
            :show-ribbon-appearance-menu="false"
            :show-advanced-settings-action="showAdvancedSettingsAction"
            :aria-label="activityAriaLabel"
            :tree-header-label="treeHeaderLabel"
            @activate="emit('activate', $event)"
            @update:expanded-node-ids="emit('update:expandedNodeIds', $event)"
            @update:appearance="emit('update:ribbonAppearance', $event)"
            @update:presentation="emit('update:presentation', $event)"
            @update:color-scheme="emit('update:colorScheme', $event)"
            @update:tree-collapsed="emit('update:treeCollapsed', $event)"
            @update:tree-appearance="emit('update:treeAppearance', $event)"
          />

          <PnwWorkbenchDisplaySettings
            v-if="showRibbonAppearanceMenu"
            :presentation="presentation"
            :effective-presentation="pnwResponsiveState.effectivePresentation"
            :responsive-narrow="pnwResponsiveState.narrow"
            :appearance="ribbonAppearance"
            :tree-appearance="treeAppearance"
            :color-scheme="colorScheme"
            :tab-bar-placement="tabBarPlacement"
            :positions="displaySettingsPositions"
            show-layout-settings
            :show-advanced-settings-action="showAdvancedSettingsAction"
            :trigger-variant="pnwResponsiveState.effectivePresentation === 'ribbon'
              ? 'ribbon'
              : treeCollapsed ? 'rail' : 'tree'"
            @update:presentation="emit('update:presentation', $event)"
            @update:appearance="emit('update:ribbonAppearance', $event)"
            @update:tree-appearance="emit('update:treeAppearance', $event)"
            @update:color-scheme="emit('update:colorScheme', $event)"
            @update:tab-bar-placement="emit('update:tabBarPlacement', $event)"
            @update:positions="emit('update:displaySettingsPositions', $event)"
            @display-settings-action="emit('displaySettingsAction', $event)"
            @open-advanced-settings="emit('openWorkbenchSettings')"
          >
            <template #additional-actions="slotProps">
              <slot name="display-settings-actions" v-bind="slotProps" />
            </template>
            <template #panel-extra>
              <slot name="display-settings-panel-extra" />
            </template>
          </PnwWorkbenchDisplaySettings>
        </div>
      </slot>
    </template>

    <slot v-if="!showEmptyView" />
    <slot v-else name="empty">
      <div class="pnw-workbench-empty-view">
        <PnwPhoenixWingMark class="pnw-workbench-empty-view-mark" decorative />
        <strong>{{ emptyViewTitle }}</strong>
        <span>{{ emptyViewDescription }}</span>
      </div>
    </slot>

    <template v-if="pnwSlots.primary || viewBlocks.primary" #primary>
      <slot name="primary">
        <component
          v-if="viewBlocks.primary"
          :is="viewBlocks.primary.component"
          v-bind="pnwResolveViewBlockComponentProps(viewBlocks.primary)"
        />
      </slot>
    </template>
    <template v-if="pnwSlots.bottom || pnwResolvedBottomBlock" #bottom="bottomSlotProps">
      <slot name="bottom" :active-tab-id="bottomSlotProps.activeTabId">
        <component
          v-if="pnwResolvedBottomBlock"
          :is="pnwResolvedBottomBlock.component"
          v-bind="pnwResolveViewBlockComponentProps(pnwResolvedBottomBlock)"
          :active-tab-id="bottomSlotProps.activeTabId"
        />
      </slot>
    </template>
    <template v-if="pnwSlots['bottom-summary']" #bottom-summary>
      <slot name="bottom-summary" />
    </template>
    <template v-if="pnwSlots.footer" #footer>
      <slot name="footer" />
    </template>
    <template v-if="pnwSlots.secondary || viewBlocks.secondary" #secondary>
      <slot name="secondary">
        <component
          v-if="viewBlocks.secondary"
          :is="viewBlocks.secondary.component"
          v-bind="pnwResolveViewBlockComponentProps(viewBlocks.secondary)"
        />
      </slot>
    </template>
  </PnwWorkbenchLayout>
</template>

<style scoped>
.pnw-workbench-activity-frame {
  min-width: 0;
  min-height: 0;
}

.pnw-workbench-activity-frame--ribbon {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
}

.pnw-workbench-activity-frame--tree {
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}

.pnw-workbench-activity-frame--ribbon > :deep(.pnw-workbench-display-settings) {
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-ribbon-bg, var(--pnw-workbench-default-ribbon-bg, #fff));
}

.pnw-workbench-default-brand {
  min-width: 188px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px 0 8px;
}

.pnw-workbench-default-brand-mark {
  --pnw-phoenix-wing-mark-size: 32px;
  filter: drop-shadow(0 3px 5px rgba(37, 99, 235, 0.22));
}

.pnw-workbench-default-brand-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.pnw-workbench-default-brand-copy strong,
.pnw-workbench-default-brand-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-workbench-default-brand-copy strong {
  font-size: 13px;
  letter-spacing: 0.01em;
}

.pnw-workbench-default-brand-copy span {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pnw-workbench-empty-view {
  width: 100%;
  height: 100%;
  min-height: 220px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 28px;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  text-align: center;
}

.pnw-workbench-empty-view-mark {
  --pnw-phoenix-wing-mark-size: 48px;
  margin-bottom: 4px;
  opacity: 0.72;
}

.pnw-workbench-empty-view strong {
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  font-size: 17px;
}

.pnw-workbench-empty-view span {
  font-size: 12px;
}

@container pnw-workbench (max-width: 700px) {
  .pnw-workbench-default-brand {
    min-width: 38px;
    padding-right: 4px;
  }

  .pnw-workbench-default-brand-copy {
    display: none;
  }
}
</style>
