<script setup lang="ts">
defineProps<{
  expanded?: boolean;
  /** 仅图标、无按钮外框（用于数量芯片内等） */
  inline?: boolean;
}>();
</script>

<template>
  <span
    class="pnw-expand-twistie"
    :class="{ 'pnw-is-expanded': expanded, 'pnw-expand-twistie-inline': inline }"
    aria-hidden="true"
  />
</template>

<style scoped>
.pnw-expand-twistie {
  display: inline-block;
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin: 0 2px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transform-origin: center;
  transition: transform 120ms ease;
  box-sizing: border-box;
}

.pnw-expand-twistie.pnw-is-expanded {
  transform: rotate(45deg);
}

.pnw-expand-twistie-inline {
  margin-left: 4px;
}
</style>
