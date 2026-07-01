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
