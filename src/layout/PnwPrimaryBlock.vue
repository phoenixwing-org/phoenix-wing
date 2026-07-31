<script setup lang="ts">
withDefaults(defineProps<{
  ariaLabel?: string;
  resizable?: boolean;
}>(), {
  ariaLabel: "Primary Block",
  resizable: true,
});
</script>

<template>
  <aside
    class="pnw-primary-block"
    :class="{ 'pnw-primary-block--resizable': resizable }"
    :aria-label="ariaLabel"
  >
    <slot />
  </aside>
</template>

<style scoped>
.pnw-primary-block {
  width: var(--pnw-primary-block-width, 260px);
  min-width: var(--pnw-primary-block-min-width, 180px);
  max-width: var(--pnw-primary-block-max-width, 420px);
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
  background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  border-right: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-primary-block--resizable {
  resize: horizontal;
}
</style>
