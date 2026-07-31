<script setup lang="ts">
withDefaults(defineProps<{
  ariaLabel?: string;
  resizable?: boolean;
}>(), {
  ariaLabel: "Secondary Block",
  resizable: true,
});
</script>

<template>
  <aside
    class="pnw-secondary-block"
    :class="{ 'pnw-secondary-block--resizable': resizable }"
    :aria-label="ariaLabel"
  >
    <slot />
  </aside>
</template>

<style scoped>
.pnw-secondary-block {
  width: var(--pnw-secondary-block-width, 280px);
  min-width: var(--pnw-secondary-block-min-width, 180px);
  max-width: var(--pnw-secondary-block-max-width, 440px);
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
  background: var(--pnw-block-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  border-left: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-secondary-block--resizable {
  resize: horizontal;
}
</style>
