<script setup lang="ts">
import { computed, useSlots, type Component } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwViewBlockComponentContributions,
  PnwWorkbenchDisplaySettingsActionSlotProps,
} from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwBottomPanelTab,
  PnwNavigationNode,
  PnwRibbonAppearance,
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
  PnwWorkbenchTabItem,
  PnwWorkbenchLayoutState,
} from "../types/PnwWorkbenchWeb.js";
import {
  pnwNavigationNodeContains,
  pnwVisibleNavigationNodes,
} from "../utils/pnwNavigationTree.js";
import {
  pnwResolveBottomViewBlockTabs,
  pnwResolveViewBlockComponentProps,
  pnwViewBlockComponentAvailability,
} from "../composables/pnwViewBlockComponents.js";
import { PNW_DEFAULT_RIBBON_APPEARANCE } from "../utils/pnwWorkbenchWeb.js";
import PnwActivityBar from "./PnwActivityBar.vue";
import PnwPhoenixWingMark from "../components/PnwPhoenixWingMark.vue";
import PnwRibbonTabBar from "./PnwRibbonTabBar.vue";
import PnwWorkbenchHeader from "./PnwWorkbenchHeader.vue";
import PnwWorkbenchLayout from "./PnwWorkbenchLayout.vue";
import PnwWorkbenchTabBar from "./PnwWorkbenchTabBar.vue";

const props = withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  presentation?: PnwActivityBarPresentation;
  activeNodeId?: string;
  expandedNodeIds?: readonly string[];
  ribbonAppearance?: PnwRibbonAppearance;
  treeCollapsed?: boolean;
  contributions?: PnwViewBlockContributions;
  viewBlocks?: PnwViewBlockComponentContributions;
  visibility?: PnwViewBlockVisibility;
  layoutState?: PnwWorkbenchLayoutState;
  bottomTabs?: readonly PnwBottomPanelTab[];
  activeBottomTabId?: string;
  colorScheme?: PnwColorScheme;
  tabs?: readonly PnwWorkbenchTabItem[];
  activeTabId?: string;
  pageIcon?: (pageId: string) => Component | undefined;
  canAddTab?: boolean;
  canCloseAllTabs?: boolean;
  closingAllTabs?: boolean;
  showRibbonAppearanceMenu?: boolean;
  showAdvancedSettingsAction?: boolean;
  headerAriaLabel?: string;
  activityAriaLabel?: string;
  treeHeaderLabel?: string;
  brandTitle?: string;
  brandSubtitle?: string;
  showEmptyView?: boolean;
  emptyViewTitle?: string;
  emptyViewDescription?: string;
}>(), {
  presentation: "ribbon",
  activeNodeId: "",
  expandedNodeIds: () => [],
  ribbonAppearance: () => PNW_DEFAULT_RIBBON_APPEARANCE,
  treeCollapsed: false,
  contributions: () => ({}),
  viewBlocks: () => ({}),
  visibility: () => ({ primary: false, bottom: false, secondary: false }),
  bottomTabs: () => [],
  activeBottomTabId: "",
  colorScheme: "system",
  tabs: () => [],
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
  "update:visibility": [visibility: PnwViewBlockVisibility];
  "update:layoutState": [layoutState: PnwWorkbenchLayoutState];
  "update:activeBottomTabId": [tabId: string];
}>();

defineSlots<{
  default(): unknown;
  "display-settings-actions"(
    props: PnwWorkbenchDisplaySettingsActionSlotProps,
  ): unknown;
  "display-settings-panel-extra"(): unknown;
  [name: string]: ((...args: any[]) => unknown) | undefined;
}>();

const pnwSlots = useSlots();
const pnwComponentAvailability = computed(() => pnwViewBlockComponentAvailability(
  props.viewBlocks,
));
const pnwResolvedContributions = computed<PnwViewBlockContributions>(() => ({
  primary: Boolean(props.contributions.primary || pnwComponentAvailability.value.primary),
  bottom: Boolean(props.contributions.bottom || pnwComponentAvailability.value.bottom),
  secondary: Boolean(props.contributions.secondary || pnwComponentAvailability.value.secondary),
}));
const pnwResolvedBottomTabs = computed(() => props.viewBlocks.bottom?.tabs
  ? pnwResolveBottomViewBlockTabs(props.viewBlocks.bottom)
  : props.bottomTabs);
const pnwRootNodes = computed(() => pnwVisibleNavigationNodes(props.nodes));
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
    @update:visibility="emit('update:visibility', $event)"
    @update:layout-state="emit('update:layoutState', $event)"
    @update:active-bottom-tab-id="emit('update:activeBottomTabId', $event)"
    @select-bottom-tab="emit('selectBottomTab', $event)"
    @toggle="emit('toggleBlock', $event)"
  >
    <template #header>
      <slot name="header">
        <PnwWorkbenchHeader
          :aria-label="headerAriaLabel"
          :show-pages="tabs.length > 0 || Boolean(pnwSlots.pages)"
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
          <template #modules>
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
          <template v-if="tabs.length > 0 || pnwSlots.pages" #pages>
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

    <template #activity>
      <slot name="activity">
        <PnwActivityBar
          :nodes="nodes"
          :presentation="presentation"
          :active-node-id="activeNodeId"
          :expanded-node-ids="expandedNodeIds"
          :appearance="ribbonAppearance"
          :color-scheme="colorScheme"
          :tree-collapsed="treeCollapsed"
          :show-ribbon-appearance-menu="showRibbonAppearanceMenu"
          :show-advanced-settings-action="showAdvancedSettingsAction"
          :aria-label="activityAriaLabel"
          :tree-header-label="treeHeaderLabel"
          @activate="emit('activate', $event)"
          @update:expanded-node-ids="emit('update:expandedNodeIds', $event)"
          @update:appearance="emit('update:ribbonAppearance', $event)"
          @update:presentation="emit('update:presentation', $event)"
          @update:color-scheme="emit('update:colorScheme', $event)"
          @display-settings-action="emit('displaySettingsAction', $event)"
          @open-advanced-settings="emit('openWorkbenchSettings')"
          @update:tree-collapsed="emit('update:treeCollapsed', $event)"
        >
          <template #display-settings-actions="slotProps">
            <slot name="display-settings-actions" v-bind="slotProps" />
          </template>
          <template #display-settings-panel-extra>
            <slot name="display-settings-panel-extra" />
          </template>
        </PnwActivityBar>
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
    <template v-if="pnwSlots.bottom || viewBlocks.bottom" #bottom="bottomSlotProps">
      <slot name="bottom" :active-tab-id="bottomSlotProps.activeTabId">
        <component
          v-if="viewBlocks.bottom"
          :is="viewBlocks.bottom.component"
          v-bind="pnwResolveViewBlockComponentProps(viewBlocks.bottom)"
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
