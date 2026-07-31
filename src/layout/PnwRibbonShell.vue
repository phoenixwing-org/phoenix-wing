<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
  layout?: "stacked" | "inline";
  /** 兼容旧入口默认显示；新 PnwRibbon 将外观操作收敛到单一菜单。 */
  showLayoutToggle?: boolean;
}>();

const emit = defineEmits<{
  open: [pageId: string];
  "update:layout": [layout: "stacked" | "inline"];
}>();
</script>

<template>
  <section class="pnw-ribbon-shell" :class="{ collapsed, inline: layout === 'inline' }">
    <div class="pnw-ribbon-body">
      <slot />
    </div>
    <div v-if="$slots.actions" class="pnw-ribbon-actions">
      <slot name="actions" />
    </div>
    <button
      v-if="!collapsed && showLayoutToggle !== false"
      class="pnw-ribbon-layout-toggle"
      :title="layout === 'inline' ? '双行显示' : '单行显示'"
      @click="emit('update:layout', layout === 'inline' ? 'stacked' : 'inline')"
    >
      <svg v-if="layout === 'inline'" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <line x1="3" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 1"/>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.2"/>
        <line y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1"/>
      </svg>
    </button>
  </section>
</template>

<style scoped>
.pnw-ribbon-shell {
  flex-shrink: 0;
  background: var(--pnw-ribbon-bg, var(--pnw-workbench-default-ribbon-bg, #fff));
  border-bottom: 1px solid var(--pnw-workbench-border, var(--border, var(--pnw-workbench-default-border, #dbe3ed)));
  display: flex;
  align-items: stretch;
}

.pnw-ribbon-body {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.pnw-ribbon-shell.inline {
  align-items: center;
}

.pnw-ribbon-shell.inline .pnw-ribbon-body {
  overflow-x: visible;
}

.pnw-ribbon-layout-toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  margin: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--pnw-workbench-muted, var(--phoenix-text-secondary, var(--pnw-workbench-default-muted, #64748b)));
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.pnw-ribbon-layout-toggle:hover {
  background: var(--pnw-control-hover-bg, var(--ribbon-btn-hover, var(--pnw-workbench-default-hover-bg, rgba(148, 163, 184, 0.12))));
  color: var(--pnw-workbench-text, var(--phoenix-text, var(--pnw-workbench-default-text, #1e293b)));
}

.pnw-ribbon-actions {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  background: inherit;
  border-left: 1px solid var(--pnw-workbench-border, var(--border, var(--pnw-workbench-default-border, #e2e8f0)));
}
</style>
