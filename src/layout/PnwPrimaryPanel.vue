<script setup lang="ts">
import PnwSidebarBlock from "./PnwSidebarBlock.vue";

withDefaults(defineProps<{
  title: string;
  ariaLabel?: string;
  /** Primary 内容是否在面板内部滚动。 */
  bodyScroll?: boolean;
}>(), {
  bodyScroll: true,
});
</script>

<template>
  <PnwSidebarBlock
    class="pnw-primary-panel"
    :title="title"
    :aria-label="ariaLabel ?? title"
    :collapsible="false"
    :body-scroll="bodyScroll"
    :body-inset="false"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.suffix" #suffix>
      <slot name="suffix" />
    </template>
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <div v-if="$slots.summary" class="pnw-primary-panel-summary">
      <slot name="summary" />
    </div>
    <div class="pnw-primary-panel-content">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PnwSidebarBlock>
</template>

<style scoped>
.pnw-primary-panel {
  --sidebar-bg: var(
    --pnw-primary-panel-bg,
    var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)))
  );
  --panel-head-bg: var(
    --pnw-primary-panel-head-bg,
    color-mix(
      in srgb,
      var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)) 88%,
      var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f1f5f9)) 12%
    )
  );
  --border: var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  --border-strong: var(--pnw-workbench-border, var(--pnw-workbench-default-border, #cbd5e1));
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-primary-panel :deep(.pnw-sidebar-block-head) {
  min-height: var(--pnw-workbench-view-header-height, 40px);
}

.pnw-primary-panel-summary {
  flex: 0 0 auto;
  margin: 0;
  padding: var(--pnw-primary-panel-summary-padding, 8px);
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 12px;
  line-height: 1.5;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-primary-panel-content {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
}
</style>
