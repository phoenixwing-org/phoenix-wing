<script setup lang="ts">
import { usePnwLocale } from "../composables/usePnwLocale.js";

defineProps<{
  tabs: readonly { id: string; label: string; fullLabel?: string }[];
  activeTab: string;
}>();

const { t: pnwT } = usePnwLocale();

const emit = defineEmits<{
  "update:activeTab": [id: string];
}>();
</script>

<template>
  <div class="pnw-ribbon-tabs" role="tablist" :aria-label="pnwT('workbench.ribbonTabs')">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      class="pnw-ribbon-tab"
      :class="{ active: tab.id === activeTab }"
      :aria-selected="tab.id === activeTab"
      :aria-label="tab.fullLabel || tab.label"
      :title="tab.fullLabel || tab.label"
      @click="emit('update:activeTab', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.pnw-ribbon-tabs {
  display: inline-flex;
  align-items: stretch;
  align-self: stretch;
  gap: var(--pnw-ribbon-module-tab-gap, 0);
  height: 100%;
  min-height: 32px;
  padding: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  background: transparent;
  box-shadow: none;
}

.pnw-ribbon-tab {
  flex: 0 0 auto;
  position: relative;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0 var(--pnw-ribbon-module-tab-padding-inline, 4px);
  margin: 0;
  height: auto;
  min-height: 32px;
  font-size: var(--pnw-ribbon-module-tab-font-size, 0.75rem);
  font-weight: 600;
  letter-spacing: 0;
  color: var(--pnw-workbench-muted, var(--phoenix-text-secondary, var(--pnw-workbench-default-muted, #475569)));
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.12s ease;
}

.pnw-ribbon-tab:hover:not(.active) {
  color: var(--pnw-workbench-text, var(--phoenix-text, var(--pnw-workbench-default-text, #1e293b)));
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(148, 163, 184, 0.1)));
}

.pnw-ribbon-tab.active {
  color: var(--pnw-control-active-text, var(--phoenix-wps-accent, var(--pnw-workbench-default-active-text, #217346)));
  font-weight: 700;
  background: transparent;
  box-shadow: none;
}

.pnw-ribbon-tab.active::after {
  content: "";
  position: absolute;
  left: var(--pnw-ribbon-module-tab-indicator-inset, 2px);
  right: var(--pnw-ribbon-module-tab-indicator-inset, 2px);
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--pnw-control-active-text, var(--phoenix-wps-accent, var(--pnw-workbench-default-active-text, #217346)));
}
</style>
