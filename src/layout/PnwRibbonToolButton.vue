<script setup lang="ts">
import { computed, type Component } from "vue";
import type {
  PnwRibbonDisplayMode,
  PnwRibbonIconSize,
} from "../types/PnwWorkbenchWeb.js";

const props = defineProps<{
  label: string;
  icon: Component | string;
  size?: "large" | "small";
  layout?: "inline" | "stacked";
  displayMode?: PnwRibbonDisplayMode;
  iconSize?: PnwRibbonIconSize;
  /** 高层 Ribbon 可独立隐藏 Title；缺省时保持现有 displayMode 行为。 */
  showTitle?: boolean;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const pnwEffectiveDisplayMode = computed<PnwRibbonDisplayMode>(() => {
  if (props.displayMode) return props.displayMode;
  return props.size === "large" && props.layout === "stacked" ? "large" : "icon-title";
});

const pnwEffectiveIconSize = computed(() => props.iconSize
  ?? (pnwEffectiveDisplayMode.value === "large" ? 24 : 16));
const pnwShowTitle = computed(() => props.showTitle
  ?? pnwEffectiveDisplayMode.value !== "icon");
</script>

<template>
  <button
    type="button"
    class="pnw-ribbon-tool-btn"
    :class="[
      displayMode ? undefined : (size === 'large' ? 'pnw-size-large' : 'pnw-size-small'),
      displayMode ? undefined : (layout === 'stacked' ? 'pnw-layout-stacked' : 'pnw-layout-inline'),
      `pnw-display-${pnwEffectiveDisplayMode}`,
      { active, disabled },
    ]"
    :style="{ '--pnw-ribbon-tool-icon-size': `${pnwEffectiveIconSize}px` }"
    :disabled="disabled"
    :title="title || label"
    :aria-label="label"
    @click="emit('click')"
  >
    <span class="pnw-ribbon-tool-icon" aria-hidden="true">
      <span v-if="typeof icon === 'string'">{{ icon }}</span>
      <component :is="icon" v-else />
    </span>
    <span v-if="pnwShowTitle" class="pnw-ribbon-tool-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.pnw-ribbon-tool-btn {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--ribbon-btn-radius, 2px);
  background: transparent;
  color: var(--pnw-workbench-text, var(--text, var(--pnw-workbench-default-text, #0f172a)));
  cursor: pointer;
  min-width: 0;
}

.pnw-ribbon-tool-btn.pnw-layout-stacked.pnw-size-large {
  flex-direction: column;
  width: 58px;
  min-width: 58px;
  max-width: 68px;
  min-height: 54px;
  padding: 5px 4px 3px;
  gap: 3px;
}

.pnw-layout-stacked.pnw-size-large .pnw-ribbon-tool-icon {
  width: 26px;
  height: 26px;
  font-size: 24px;
}

.pnw-layout-stacked.pnw-size-large .pnw-ribbon-tool-label {
  font-size: 0.62rem;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 54px;
}

.pnw-ribbon-tool-btn.pnw-size-small.pnw-layout-inline {
  flex-direction: row;
  width: auto;
  min-width: 88px;
  max-width: 132px;
  min-height: 22px;
  padding: 1px 6px 1px 4px;
  gap: 5px;
  justify-content: flex-start;
}

.pnw-size-small.pnw-layout-inline .pnw-ribbon-tool-icon {
  width: 14px;
  height: 14px;
  font-size: 13px;
}

.pnw-size-small.pnw-layout-inline .pnw-ribbon-tool-label {
  font-size: 0.66rem;
  line-height: 1.1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnw-ribbon-tool-btn.pnw-layout-inline:not(.pnw-size-small) {
  width: auto;
  min-width: 0;
  max-width: none;
  min-height: 36px;
  padding: 0 10px;
  gap: 5px;
  flex-shrink: 0;
}

.pnw-layout-inline:not(.pnw-size-small) .pnw-ribbon-tool-label {
  font-size: 0.72rem;
  line-height: 1.2;
  white-space: nowrap;
}

.pnw-layout-inline:not(.pnw-size-small) .pnw-ribbon-tool-icon {
  width: 15px;
  height: 15px;
  font-size: 14px;
}

.pnw-ribbon-tool-btn:hover:not(:disabled) {
  background: var(--pnw-control-hover-bg, var(--ribbon-btn-hover, var(--pnw-workbench-default-hover-bg, rgba(148, 163, 184, 0.12))));
  border-color: transparent;
}

.pnw-ribbon-tool-btn.active {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(33, 115, 70, 0.1)));
  border-color: var(--pnw-control-active-border, rgba(33, 115, 70, 0.25));
  color: var(--pnw-control-active-text, var(--phoenix-wps-accent, var(--pnw-workbench-default-active-text, #217346)));
}

.pnw-ribbon-tool-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.pnw-ribbon-tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #334155));
}

.pnw-ribbon-tool-btn.active .pnw-ribbon-tool-icon {
  color: var(--pnw-control-active-text, var(--phoenix-wps-accent, var(--pnw-workbench-default-active-text, #217346)));
}

.pnw-ribbon-tool-btn.pnw-display-icon {
  width: calc(var(--pnw-ribbon-tool-icon-size) + 16px);
  min-width: calc(var(--pnw-ribbon-tool-icon-size) + 16px);
  max-width: none;
  height: max(28px, calc(var(--pnw-ribbon-tool-icon-size) + 10px));
  min-height: max(28px, calc(var(--pnw-ribbon-tool-icon-size) + 10px));
  flex-direction: row;
  padding: 3px 8px;
}

.pnw-ribbon-tool-btn.pnw-display-icon-title {
  width: auto;
  min-width: calc(var(--pnw-ribbon-tool-icon-size) + 54px);
  max-width: 152px;
  height: max(28px, calc(var(--pnw-ribbon-tool-icon-size) + 10px));
  min-height: max(28px, calc(var(--pnw-ribbon-tool-icon-size) + 10px));
  flex-direction: row;
  justify-content: flex-start;
  padding: 3px 8px;
}

.pnw-ribbon-tool-btn.pnw-display-large {
  width: calc(var(--pnw-ribbon-tool-icon-size) + 34px);
  min-width: calc(var(--pnw-ribbon-tool-icon-size) + 34px);
  max-width: 82px;
  min-height: calc(var(--pnw-ribbon-tool-icon-size) + 32px);
  flex-direction: column;
  padding: 6px 5px 4px;
}

.pnw-display-icon .pnw-ribbon-tool-icon,
.pnw-display-icon-title .pnw-ribbon-tool-icon,
.pnw-display-large .pnw-ribbon-tool-icon {
  width: var(--pnw-ribbon-tool-icon-size);
  height: var(--pnw-ribbon-tool-icon-size);
  font-size: calc(var(--pnw-ribbon-tool-icon-size) * 0.9);
}

.pnw-display-icon .pnw-ribbon-tool-icon :deep(svg),
.pnw-display-icon-title .pnw-ribbon-tool-icon :deep(svg),
.pnw-display-large .pnw-ribbon-tool-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.pnw-display-icon-title .pnw-ribbon-tool-label {
  font-size: 0.72rem;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnw-display-large .pnw-ribbon-tool-label {
  max-width: 72px;
  font-size: 0.68rem;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
