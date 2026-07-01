<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  label: string;
  icon: Component;
  size?: "large" | "small";
  layout?: "inline" | "stacked";
  active?: boolean;
  disabled?: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    class="pnw-ribbon-tool-btn"
    :class="[
      size === 'large' ? 'pnw-size-large' : 'pnw-size-small',
      layout === 'stacked' ? 'pnw-layout-stacked' : 'pnw-layout-inline',
      { active, disabled },
    ]"
    :disabled="disabled"
    :title="title || label"
    @click="emit('click')"
  >
    <span class="pnw-ribbon-tool-icon" aria-hidden="true">
      <component :is="icon" />
    </span>
    <span class="pnw-ribbon-tool-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.pnw-ribbon-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--ribbon-btn-radius, 2px);
  background: transparent;
  color: var(--text);
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
  background: var(--ribbon-btn-hover);
  border-color: transparent;
}

.pnw-ribbon-tool-btn.active {
  background: rgba(33, 115, 70, 0.1);
  border-color: rgba(33, 115, 70, 0.25);
  color: var(--phoenix-wps-accent, #217346);
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
  color: #334155;
}

.pnw-ribbon-tool-btn.active .pnw-ribbon-tool-icon {
  color: var(--phoenix-wps-accent, #217346);
}
</style>
