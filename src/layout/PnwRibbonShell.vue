<script setup lang="ts">
defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  open: [pageId: string];
}>();
</script>

<template>
  <section class="pnw-ribbon-shell" :class="{ collapsed }">
    <slot />
  </section>
</template>

<style scoped>
.pnw-ribbon-shell {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid var(--border);
}
</style>
