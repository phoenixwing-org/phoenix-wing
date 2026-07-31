<script setup lang="ts">
import { computed, nextTick, type Component, type ComponentPublicInstance } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchDisplaySettingsActionSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityTreeAppearance,
  PnwNavigationNode,
  PnwRibbonAppearance,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
} from "../utils/pnwWorkbenchWeb.js";
import {
  pnwFlattenNavigationTree,
  pnwNavigationNodeContains,
  pnwNormalizeNavigationVisibility,
} from "../utils/pnwNavigationTree.js";
import PnwIcon from "../components/PnwIcon.vue";
import PnwActivityTreeRail from "./PnwActivityTreeRail.vue";
import PnwWorkbenchDisplaySettings from "./PnwWorkbenchDisplaySettings.vue";

const props = withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  activeNodeId?: string;
  expandedNodeIds?: readonly string[];
  ariaLabel?: string;
  headerLabel?: string;
  /** 受控收起态；只投影可激活末级节点，不改变导航树数据。 */
  collapsed?: boolean;
  treeAppearance?: PnwActivityTreeAppearance;
  appearance?: PnwRibbonAppearance;
  colorScheme?: PnwColorScheme;
  showWorkbenchDisplaySettings?: boolean;
  showAdvancedSettingsAction?: boolean;
}>(), {
  activeNodeId: "",
  expandedNodeIds: () => [],
  ariaLabel: "全局导航",
  headerLabel: "导航工具",
  collapsed: false,
  treeAppearance: () => PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  appearance: () => PNW_DEFAULT_RIBBON_APPEARANCE,
  colorScheme: "system",
  showWorkbenchDisplaySettings: false,
  showAdvancedSettingsAction: false,
});

const emit = defineEmits<{
  activate: [nodeId: string];
  "update:expandedNodeIds": [nodeIds: readonly string[]];
  "update:collapsed": [collapsed: boolean];
  "update:presentation": [presentation: "ribbon" | "tree"];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:colorScheme": [colorScheme: PnwColorScheme];
  displaySettingsAction: [actionId: string];
  openAdvancedSettings: [];
}>();

defineSlots<{
  "display-settings-actions"(
    props: PnwWorkbenchDisplaySettingsActionSlotProps,
  ): unknown;
  "display-settings-panel-extra"(): unknown;
}>();

const pnwNavigationNodes = computed(() => pnwNormalizeNavigationVisibility(props.nodes));
const pnwRows = computed(() => pnwFlattenNavigationTree(
  pnwNavigationNodes.value,
  props.expandedNodeIds,
));
const pnwTreeButtons = new Map<string, HTMLButtonElement>();

function pnwSetTreeButton(
  nodeId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) pnwTreeButtons.set(nodeId, element);
  else pnwTreeButtons.delete(nodeId);
}

function pnwIsTextIcon(icon: unknown): icon is string | number {
  return typeof icon === "string" || typeof icon === "number";
}

function pnwVueIcon(icon: unknown): Component {
  return icon as Component;
}

function pnwToggleExpanded(nodeId: string): void {
  const next = new Set(props.expandedNodeIds);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  emit("update:expandedNodeIds", [...next]);
}

function pnwContainsActive(node: PnwNavigationNode): boolean {
  return Boolean(props.activeNodeId && pnwNavigationNodeContains(node, props.activeNodeId));
}

function pnwActivateOrExpand(node: PnwNavigationNode, hasChildren: boolean): void {
  if (hasChildren) {
    pnwToggleExpanded(node.id);
    return;
  }
  if (!node.disabled) emit("activate", node.id);
}

function pnwFocusRow(index: number): void {
  const row = pnwRows.value[index];
  if (row) pnwTreeButtons.get(row.node.id)?.focus();
}

async function pnwHandleTreeKeydown(event: KeyboardEvent, rowIndex: number): Promise<void> {
  const row = pnwRows.value[rowIndex];
  if (!row) return;
  const expanded = props.expandedNodeIds.includes(row.node.id);
  let handled = true;

  switch (event.key) {
    case "ArrowDown":
      pnwFocusRow(Math.min(rowIndex + 1, pnwRows.value.length - 1));
      break;
    case "ArrowUp":
      pnwFocusRow(Math.max(rowIndex - 1, 0));
      break;
    case "Home":
      pnwFocusRow(0);
      break;
    case "End":
      pnwFocusRow(pnwRows.value.length - 1);
      break;
    case "ArrowRight":
      if (!row.hasChildren) break;
      if (!expanded) {
        pnwToggleExpanded(row.node.id);
        await nextTick();
      } else {
        pnwFocusRow(rowIndex + 1);
      }
      break;
    case "ArrowLeft":
      if (row.hasChildren && expanded) {
        pnwToggleExpanded(row.node.id);
      } else if (row.parentId) {
        const parentIndex = pnwRows.value.findIndex(({ node }) => node.id === row.parentId);
        pnwFocusRow(parentIndex);
      }
      break;
    case "Enter":
    case " ":
      pnwActivateOrExpand(row.node, row.hasChildren);
      break;
    default:
      handled = false;
  }

  if (handled) event.preventDefault();
}
</script>

<template>
  <nav
    class="pnw-activity-tree"
    :class="[
      { 'pnw-activity-tree--collapsed': collapsed },
      `pnw-activity-tree--expanded-${treeAppearance.expanded}`,
      `pnw-activity-tree--collapsed-${treeAppearance.collapsed}`,
    ]"
    :data-pnw-activity-tree-collapsed="collapsed"
    :data-pnw-activity-tree-expanded-mode="treeAppearance.expanded"
    :data-pnw-activity-tree-collapsed-mode="treeAppearance.collapsed"
    :aria-label="ariaLabel"
  >
    <header class="pnw-activity-tree-header">
      <span v-if="!collapsed" class="pnw-activity-tree-header-label">{{ headerLabel }}</span>
      <button
        type="button"
        class="pnw-activity-tree-toggle"
        :aria-label="collapsed ? '展开目录树' : '折叠为 Activity Bar'"
        :title="collapsed ? '展开目录树' : '折叠为 Activity Bar'"
        :aria-expanded="!collapsed"
        @click="emit('update:collapsed', !collapsed)"
      >
        <PnwIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" :size="18" />
      </button>
    </header>

    <PnwActivityTreeRail
      v-if="collapsed"
      :nodes="pnwNavigationNodes"
      :active-node-id="activeNodeId"
      :expanded-node-ids="expandedNodeIds"
      :mode="treeAppearance.collapsed"
      :aria-label="`${ariaLabel}快捷栏`"
      :color-scheme="colorScheme"
      @activate="emit('activate', $event)"
      @update:expanded-node-ids="emit('update:expandedNodeIds', $event)"
    />

    <div v-else class="pnw-activity-tree-list" role="tree">
      <button
        v-for="(row, rowIndex) in pnwRows"
        :key="row.node.id"
        :ref="(element) => pnwSetTreeButton(row.node.id, element)"
        type="button"
        role="treeitem"
        class="pnw-activity-tree-item"
        :class="{
          'pnw-activity-tree-item--active': row.node.id === activeNodeId,
          'pnw-activity-tree-item--active-path': row.node.id !== activeNodeId
            && pnwContainsActive(row.node),
          'pnw-activity-tree-item--branch': row.hasChildren,
          'pnw-activity-tree-item--disabled': row.node.disabled,
        }"
        :style="{ '--pnw-activity-tree-depth': row.depth }"
        :tabindex="row.node.id === activeNodeId || (!activeNodeId && rowIndex === 0) ? 0 : -1"
        :aria-level="row.depth"
        :aria-expanded="row.hasChildren ? expandedNodeIds.includes(row.node.id) : undefined"
        :aria-selected="row.node.id === activeNodeId"
        :aria-disabled="row.node.disabled || undefined"
        :aria-current="row.node.id === activeNodeId ? 'page' : undefined"
        :title="row.node.label"
        @click="pnwActivateOrExpand(row.node, row.hasChildren)"
        @keydown="pnwHandleTreeKeydown($event, rowIndex)"
      >
        <span class="pnw-activity-tree-caret" aria-hidden="true">
          <PnwIcon
            v-if="row.hasChildren"
            :name="expandedNodeIds.includes(row.node.id) ? 'chevron-down' : 'chevron-right'"
            :size="12"
          />
        </span>
        <span v-if="row.node.icon !== undefined" class="pnw-activity-tree-icon" aria-hidden="true">
          <span v-if="pnwIsTextIcon(row.node.icon)">{{ row.node.icon }}</span>
          <component :is="pnwVueIcon(row.node.icon)" v-else />
        </span>
        <span class="pnw-activity-tree-label">{{ row.node.label }}</span>
      </button>
    </div>

    <PnwWorkbenchDisplaySettings
      v-if="showWorkbenchDisplaySettings"
      presentation="tree"
      :appearance="appearance"
      :tree-appearance="treeAppearance"
      :color-scheme="colorScheme"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      :trigger-variant="collapsed ? 'rail' : 'tree'"
      @update:presentation="emit('update:presentation', $event)"
      @update:appearance="emit('update:appearance', $event)"
      @update:tree-appearance="emit('update:treeAppearance', $event)"
      @update:color-scheme="emit('update:colorScheme', $event)"
      @display-settings-action="emit('displaySettingsAction', $event)"
      @open-advanced-settings="emit('openAdvancedSettings')"
    >
      <template #additional-actions="slotProps">
        <slot name="display-settings-actions" v-bind="slotProps" />
      </template>
      <template #panel-extra>
        <slot name="display-settings-panel-extra" />
      </template>
    </PnwWorkbenchDisplaySettings>
  </nav>
</template>

<style scoped>
.pnw-activity-tree {
  width: var(--pnw-activity-tree-width, 240px);
  min-width: var(--pnw-activity-tree-min-width, 192px);
  max-width: var(--pnw-activity-tree-max-width, 320px);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--pnw-activity-tree-bg, var(--pnw-workbench-default-tree-bg, #f8fafc));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  border-right: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  transition: width 160ms ease, min-width 160ms ease, max-width 160ms ease;
}

.pnw-activity-tree--collapsed {
  width: var(--pnw-activity-rail-width, 48px);
  min-width: var(--pnw-activity-rail-width, 48px);
  max-width: var(--pnw-activity-rail-width, 48px);
}

.pnw-activity-tree-header {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 3px 5px 3px 12px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-activity-tree--collapsed .pnw-activity-tree-header {
  justify-content: center;
  padding-inline: 4px;
}

.pnw-activity-tree-header-label {
  min-width: 0;
  overflow: hidden;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.pnw-activity-tree-toggle {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
  margin-left: auto;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 5px);
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
  font: inherit;
  line-height: 1;
}

.pnw-activity-tree--collapsed .pnw-activity-tree-toggle {
  margin-left: 0;
}

.pnw-activity-tree-toggle:hover,
.pnw-activity-tree-toggle:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-activity-tree-toggle:focus-visible {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-activity-tree-list {
  flex: 1 1 auto;
  min-height: 0;
  min-width: max-content;
  overflow: auto;
  padding: 8px 6px;
}

.pnw-activity-tree-item {
  width: 100%;
  min-width: 180px;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 0 10px 0 calc(8px + (var(--pnw-activity-tree-depth) - 1) * 18px);
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 5px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.pnw-activity-tree-item:hover,
.pnw-activity-tree-item:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-activity-tree-item:focus-visible {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-activity-tree-item--active {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
  font-weight: 600;
}

.pnw-activity-tree-item--active-path {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-activity-tree-item--disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.pnw-activity-tree-caret {
  width: 12px;
  flex: 0 0 12px;
  text-align: center;
}

.pnw-activity-tree-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
}

.pnw-activity-tree-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.pnw-activity-tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-list {
  padding: 6px;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-item {
  min-width: 188px;
  height: 42px;
  gap: 8px;
  padding-left: calc(10px + (var(--pnw-activity-tree-depth) - 1) * 16px);
  border-radius: 6px;
  font-size: 13px;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-caret {
  order: 3;
  margin-left: auto;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-icon {
  order: 1;
  width: 20px;
  height: 20px;
  flex-basis: 20px;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-label {
  order: 2;
}

.pnw-activity-tree--expanded-admin-menu:not(.pnw-activity-tree--collapsed) .pnw-activity-tree-item--branch {
  font-weight: 600;
}
</style>
