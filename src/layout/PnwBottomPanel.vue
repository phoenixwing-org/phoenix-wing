<script setup lang="ts">
import { computed, useSlots } from "vue";
import type { PnwBottomPanelTab } from "../types/PnwWorkbenchWeb.js";

const props = withDefaults(defineProps<{
  ariaLabel?: string;
  tabs?: readonly PnwBottomPanelTab[];
  activeTabId?: string;
  /** @deprecated 工作台组合布局由外层显式 separator 统一调节尺寸。 */
  resizable?: boolean;
}>(), {
  ariaLabel: "Bottom Panel",
  tabs: () => [],
  activeTabId: "",
  resizable: false,
});

const emit = defineEmits<{
  selectTab: [tabId: string];
  "update:activeTabId": [tabId: string];
}>();

const pnwSlots = useSlots();
const pnwTabs = computed(() => props.tabs ?? []);
const pnwActiveTabId = computed(() => pnwTabs.value.some(
  (tab) => tab.id === props.activeTabId && !tab.disabled,
) ? props.activeTabId ?? "" : pnwTabs.value.find((tab) => !tab.disabled)?.id ?? "");

function pnwSelectTab(tab: PnwBottomPanelTab): void {
  if (tab.disabled) return;
  emit("update:activeTabId", tab.id);
  emit("selectTab", tab.id);
}
</script>

<template>
  <section
    class="pnw-bottom-panel"
    :aria-label="ariaLabel"
  >
    <header
      v-if="pnwTabs.length > 0 || pnwSlots.summary"
      class="pnw-bottom-panel-head"
    >
      <div class="pnw-bottom-panel-tabs" role="tablist" :aria-label="`${ariaLabel}标签`">
        <button
          v-for="tab in pnwTabs"
          :id="`pnw-bottom-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :class="[`pnw-bottom-panel-tab--${tab.tone ?? 'default'}`, {
            'pnw-bottom-panel-tab--active': tab.id === pnwActiveTabId,
          }]"
          :aria-selected="tab.id === pnwActiveTabId"
          :aria-controls="`pnw-bottom-tabpanel-${tab.id}`"
          :disabled="tab.disabled"
          @click="pnwSelectTab(tab)"
        >
          <span>{{ tab.label }}</span>
          <small v-if="typeof tab.count === 'number'">{{ tab.count }}</small>
        </button>
      </div>
      <div v-if="pnwSlots.summary" class="pnw-bottom-panel-summary">
        <slot name="summary" />
      </div>
    </header>
    <div
      v-if="pnwTabs.length > 0"
      :id="`pnw-bottom-tabpanel-${pnwActiveTabId}`"
      class="pnw-bottom-panel-body"
      role="tabpanel"
      :aria-labelledby="`pnw-bottom-tab-${pnwActiveTabId}`"
    >
      <slot :name="pnwActiveTabId" :active-tab-id="pnwActiveTabId">
        <slot :active-tab-id="pnwActiveTabId" />
      </slot>
    </div>
    <div v-else class="pnw-bottom-panel-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.pnw-bottom-panel {
  height: var(--pnw-bottom-panel-height, 190px);
  min-height: var(--pnw-bottom-panel-min-height, 96px);
  max-height: var(--pnw-bottom-panel-max-height, 55vh);
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-bottom-panel-head {
  min-height: 34px;
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: 8px;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f8fafc));
}

.pnw-bottom-panel-tabs {
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 2px;
  overflow-x: auto;
}

.pnw-bottom-panel-tabs button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 0;
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
}

.pnw-bottom-panel-tabs button::after {
  position: absolute;
  right: 7px;
  bottom: 0;
  left: 7px;
  height: 2px;
  background: transparent;
  content: "";
}

.pnw-bottom-panel-tabs button:hover:not(:disabled),
.pnw-bottom-panel-tabs button:focus-visible {
  outline: none;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-bottom-panel-tabs button:focus-visible {
  box-shadow: inset 0 0 0 2px var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-bottom-panel-tabs button:disabled {
  cursor: default;
  opacity: 0.45;
}

.pnw-bottom-panel-tabs .pnw-bottom-panel-tab--active {
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-bottom-panel-tabs .pnw-bottom-panel-tab--active::after {
  background: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
}

.pnw-bottom-panel-tabs small {
  min-width: 16px;
  padding: 1px 4px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  font-size: 9px;
  text-align: center;
}

.pnw-bottom-panel-tab--warning small {
  color: #b45309;
}

.pnw-bottom-panel-tab--error small {
  color: #b91c1c;
}

.pnw-bottom-panel-summary {
  min-width: 0;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  padding-right: 9px;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-bottom-panel-body {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}
</style>
