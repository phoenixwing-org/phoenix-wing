<script setup lang="ts">
import type { Component } from "vue";
import PnwRibbonToolButton from "./PnwRibbonToolButton.vue";

export type PnwRibbonGroupItem = {
  pageId: string;
  label: string;
  icon: Component;
  active: boolean;
  disabled: boolean;
  title: string;
};

defineProps<{
  label: string;
  items: PnwRibbonGroupItem[];
  layout?: "stacked" | "inline";
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
        :active="item.active"
        :disabled="item.disabled"
        :title="item.title"
        @click="emit('open', item.pageId)"
      />
    </div>
  </div>
</template>

<style scoped>
.pnw-ribbon-group {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 0;
  padding: 0 8px;
  border-right: 1px solid var(--ribbon-group-divider);
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
</style>
