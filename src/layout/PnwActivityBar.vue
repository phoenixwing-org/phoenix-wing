<script setup lang="ts">
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchDisplaySettingsActionSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwNavigationNode,
  PnwRibbonAppearance,
} from "../types/PnwWorkbenchWeb.js";
import PnwActivityTree from "./PnwActivityTree.vue";
import PnwRibbon from "./PnwRibbon.vue";

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
  colorScheme?: PnwColorScheme;
  showAdvancedSettingsAction?: boolean;
}>(), {
  activeNodeId: "",
  expandedNodeIds: () => [],
  ariaLabel: "全局活动导航",
  showRibbonAppearanceMenu: true,
  treeHeaderLabel: "导航工具",
  treeCollapsed: false,
  colorScheme: "system",
  showAdvancedSettingsAction: false,
});

const emit = defineEmits<{
  activate: [nodeId: string];
  "update:expandedNodeIds": [nodeIds: readonly string[]];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeCollapsed": [collapsed: boolean];
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
      :presentation="presentation"
      :color-scheme="colorScheme"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      :aria-label="ariaLabel"
      :show-appearance-menu="showRibbonAppearanceMenu"
      @activate="emit('activate', $event)"
      @update:appearance="emit('update:appearance', $event)"
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
      :appearance="appearance"
      :color-scheme="colorScheme"
      :show-workbench-display-settings="showRibbonAppearanceMenu"
      :show-advanced-settings-action="showAdvancedSettingsAction"
      @activate="emit('activate', $event)"
      @update:expanded-node-ids="emit('update:expandedNodeIds', $event)"
      @update:collapsed="emit('update:treeCollapsed', $event)"
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
  flex: 0 0 auto;
}

.pnw-activity-bar--tree {
  height: 100%;
  flex: 0 0 auto;
}
</style>
