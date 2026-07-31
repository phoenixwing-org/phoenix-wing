<script setup lang="ts">
withDefaults(defineProps<{
  ariaLabel?: string;
  /** 条件 slot 在 Vue 中仍可能被注册；由组合壳显式控制空页签区。 */
  showPages?: boolean;
}>(), {
  ariaLabel: "工作台页眉",
  showPages: true,
});
</script>

<template>
  <header class="pnw-workbench-header" :aria-label="ariaLabel">
    <div v-if="$slots.brand" class="pnw-workbench-header-brand">
      <slot name="brand" />
    </div>
    <div v-if="$slots.modules" class="pnw-workbench-header-modules">
      <slot name="modules" />
    </div>
    <div v-if="showPages && $slots.pages" class="pnw-workbench-header-pages">
      <slot name="pages" />
    </div>
    <div v-if="$slots.actions" class="pnw-workbench-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.pnw-workbench-header {
  width: 100%;
  height: var(--pnw-workbench-header-height, 48px);
  min-height: var(--pnw-workbench-header-height, 48px);
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow: hidden;
  box-sizing: border-box;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-header-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: var(--pnw-header-shadow, 0 2px 8px rgba(15, 23, 42, 0.06));
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules,
.pnw-workbench-header-pages,
.pnw-workbench-header-actions {
  min-width: 0;
  display: flex;
  align-items: stretch;
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules,
.pnw-workbench-header-actions {
  flex: 0 0 auto;
}

.pnw-workbench-header-modules {
  max-width: var(--pnw-workbench-header-modules-max-width, min(36vw, 360px));
  overflow: hidden;
}

.pnw-workbench-header-brand,
.pnw-workbench-header-modules {
  border-right: 1px solid var(--pnw-header-divider, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)));
}

.pnw-workbench-header-pages {
  flex: 1 1 auto;
  overflow: hidden;
}

.pnw-workbench-header-actions {
  justify-content: flex-end;
  margin-left: auto;
  border-left: 1px solid var(--pnw-header-divider, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed)));
}

.pnw-workbench-header :deep(button) {
  font-family: inherit;
}

@container pnw-workbench (max-width: 720px) {
  .pnw-workbench-header {
    --pnw-workbench-header-height: 44px;
  }

  .pnw-workbench-header-brand {
    max-width: 48px;
    overflow: hidden;
  }

  .pnw-workbench-header-modules {
    max-width: 46%;
    overflow-x: auto;
    overflow-y: hidden;
  }
}
</style>
