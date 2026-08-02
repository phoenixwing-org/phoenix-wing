<script setup lang="ts">
import type {
  PnwRibbonDisplayMode,
  PnwRibbonIconSize,
} from "../types/PnwWorkbenchWeb.js";
import PnwRibbonToolButton from "./PnwRibbonToolButton.vue";

export type PnwRibbonGroupItem = {
  pageId: string;
  label: string;
  icon: unknown;
  active: boolean;
  disabled: boolean;
  title: string;
};

defineProps<{
  label: string;
  items: readonly PnwRibbonGroupItem[];
  layout?: "stacked" | "inline";
  displayMode?: PnwRibbonDisplayMode;
  iconSize?: PnwRibbonIconSize;
  showLabel?: boolean;
  showTitles?: boolean;
}>();

const emit = defineEmits<{
  open: [pageId: string];
}>();
</script>

<template>
  <div class="pnw-ribbon-group" :aria-label="label">
    <div class="pnw-ribbon-group-body">
      <PnwRibbonToolButton
        v-for="item in items"
        :key="item.pageId"
        :label="item.label"
        :icon="item.icon"
        :size="layout === 'inline' ? 'small' : 'large'"
        :layout="layout === 'inline' ? 'inline' : 'stacked'"
        :display-mode="displayMode"
        :icon-size="iconSize"
        :show-title="showTitles"
        :active="item.active"
        :disabled="item.disabled"
        :title="item.title"
        @click="emit('open', item.pageId)"
      />
    </div>
    <div v-if="showLabel" class="pnw-ribbon-group-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.pnw-ribbon-group {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 0;
  padding: 0 8px;
  border-right: 1px solid var(--pnw-workbench-border, var(--ribbon-group-divider, var(--pnw-workbench-default-border, #dbe3ed)));
  justify-content: center;
}

.pnw-ribbon-group-body {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.pnw-ribbon-group-label {
  flex: 0 0 auto;
  min-height: 17px;
  padding: 1px 4px 2px;
  overflow: hidden;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
