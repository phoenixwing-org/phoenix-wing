<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  summary?: string;
  defaultOpen?: boolean;
}>(), {
  summary: "",
  defaultOpen: false,
});
</script>

<template>
  <details class="pnw-workbench-display-settings-section" :open="defaultOpen || undefined">
    <summary class="pnw-workbench-display-settings-section-head">
      <h3>{{ title }}</h3>
      <span v-if="summary">{{ summary }}</span>
    </summary>
    <div class="pnw-workbench-display-settings-section-body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.pnw-workbench-display-settings-section {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: 7px;
  background: color-mix(in srgb, var(--pnw-workbench-surface, #fff) 88%, var(--pnw-workbench-bg, #f8fafc) 12%);
}

.pnw-workbench-display-settings-section-head {
  min-height: 34px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 10px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  cursor: pointer;
  list-style: none;
}

.pnw-workbench-display-settings-section-head::-webkit-details-marker {
  display: none;
}

.pnw-workbench-display-settings-section-head::after {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  content: "›";
  font-size: 16px;
  transition: transform 120ms ease;
}

.pnw-workbench-display-settings-section[open] > .pnw-workbench-display-settings-section-head::after {
  transform: rotate(90deg);
}

.pnw-workbench-display-settings-section-head:hover,
.pnw-workbench-display-settings-section-head:focus-visible {
  outline: 0;
  background: var(--pnw-control-hover-bg, rgba(59, 130, 246, 0.09));
}

.pnw-workbench-display-settings-section-head h3 {
  margin: 0;
  font-size: 13px;
}

.pnw-workbench-display-settings-section-head span {
  overflow: hidden;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-workbench-display-settings-section-body {
  display: grid;
  gap: 8px;
  padding: 0 9px 9px;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 11px;
}
</style>
