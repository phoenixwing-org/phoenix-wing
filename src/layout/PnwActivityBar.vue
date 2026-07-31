<script setup lang="ts">
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchDisplaySettingsActionSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwNavigationNode,
  PnwRibbonAppearance,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
} from "../utils/pnwWorkbenchWeb.js";
import PnwActivityTree from "./PnwActivityTree.vue";
import PnwRibbon from "./PnwRibbon.vue";
import PnwWorkbenchDisplaySettings from "./PnwWorkbenchDisplaySettings.vue";

withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  presentation: PnwActivityBarPresentation;
  activeNodeId?: string;
  expandedNodeIds?: readonly string[];
  appearance?: PnwRibbonAppearance;
  ariaLabel?: string;
  showRibbonAppearanceMenu?: boolean;
  treeHeaderLabel?: string;
  treeCollapsed?: boolean;
  treeAppearance?: PnwActivityTreeAppearance;
  colorScheme?: PnwColorScheme;
  showAdvancedSettingsAction?: boolean;
}>(), {
  activeNodeId: "",
  expandedNodeIds: () => [],
  appearance: () => PNW_DEFAULT_RIBBON_APPEARANCE,
  ariaLabel: "全局活动导航",
  showRibbonAppearanceMenu: true,
  treeHeaderLabel: "导航工具",
  treeCollapsed: false,
  treeAppearance: () => PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  colorScheme: "system",
  showAdvancedSettingsAction: false,
});

const emit = defineEmits<{
  activate: [nodeId: string];
  "update:expandedNodeIds": [nodeIds: readonly string[]];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeCollapsed": [collapsed: boolean];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:presentation": [presentation: PnwActivityBarPresentation];
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
</script>

<template>
  <section
    class="pnw-activity-bar"
    :class="`pnw-activity-bar--${presentation}`"
    :aria-label="ariaLabel"
  >
    <PnwRibbon
      v-if="presentation === 'ribbon'"
      :nodes="nodes"
      :active-node-id="activeNodeId"
      :appearance="appearance"
      :tree-appearance="treeAppearance"
      :presentation="presentation"
      :color-scheme="colorScheme"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      :aria-label="ariaLabel"
      :show-appearance-menu="false"
      @activate="emit('activate', $event)"
      @update:appearance="emit('update:appearance', $event)"
      @update:tree-appearance="emit('update:treeAppearance', $event)"
      @update:presentation="emit('update:presentation', $event)"
      @update:color-scheme="emit('update:colorScheme', $event)"
      @display-settings-action="emit('displaySettingsAction', $event)"
      @open-advanced-settings="emit('openAdvancedSettings')"
    >
      <template #display-settings-actions="slotProps">
        <slot name="display-settings-actions" v-bind="slotProps" />
      </template>
      <template #display-settings-panel-extra>
        <slot name="display-settings-panel-extra" />
      </template>
    </PnwRibbon>
    <PnwActivityTree
      v-else
      :nodes="nodes"
      :active-node-id="activeNodeId"
      :expanded-node-ids="expandedNodeIds"
      :aria-label="ariaLabel"
      :header-label="treeHeaderLabel"
      :collapsed="treeCollapsed"
      :tree-appearance="treeAppearance"
      :appearance="appearance"
      :color-scheme="colorScheme"
      :show-workbench-display-settings="false"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      @activate="emit('activate', $event)"
      @update:expanded-node-ids="emit('update:expandedNodeIds', $event)"
      @update:collapsed="emit('update:treeCollapsed', $event)"
      @update:tree-appearance="emit('update:treeAppearance', $event)"
      @update:presentation="emit('update:presentation', $event)"
      @update:appearance="emit('update:appearance', $event)"
      @update:color-scheme="emit('update:colorScheme', $event)"
      @display-settings-action="emit('displaySettingsAction', $event)"
      @open-advanced-settings="emit('openAdvancedSettings')"
    >
      <template #display-settings-actions="slotProps">
        <slot name="display-settings-actions" v-bind="slotProps" />
      </template>
      <template #display-settings-panel-extra>
        <slot name="display-settings-panel-extra" />
      </template>
    </PnwActivityTree>

    <!--
      设置实例必须位于 presentation 分支之外。否则 Ribbon/Tree 切换会卸载
      打开的 modeless 面板，并丢失面板位置与快捷菜单状态。
    -->
    <PnwWorkbenchDisplaySettings
      v-if="showRibbonAppearanceMenu"
      :presentation="presentation"
      :appearance="appearance"
      :tree-appearance="treeAppearance"
      :color-scheme="colorScheme"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      :trigger-variant="presentation === 'ribbon' ? 'ribbon' : treeCollapsed ? 'rail' : 'tree'"
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
  </section>
</template>

<style scoped>
.pnw-activity-bar {
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}

.pnw-activity-bar--ribbon {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  flex: 0 0 auto;
}

.pnw-activity-bar--tree {
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  flex: 0 0 auto;
}

.pnw-activity-bar--ribbon > :deep(.pnw-workbench-display-settings) {
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-ribbon-bg, var(--pnw-workbench-default-ribbon-bg, #fff));
}
</style>
