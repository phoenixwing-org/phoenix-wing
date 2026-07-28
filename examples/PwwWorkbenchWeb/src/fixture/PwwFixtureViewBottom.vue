<script setup lang="ts">
defineProps<{
  title: string;
  activeNodeId: string;
  activeTabId: string;
  eventLog: readonly string[];
}>();
</script>

<template>
  <section class="pww-bottom-content">
    <div class="pww-block-heading">
      <div>
        <span class="pww-block-kicker">BOTTOM · VIEW CONTRIBUTION</span>
        <h2>{{ activeTabId === "output" ? title : "问题" }}</h2>
      </div>
    </div>
    <ol v-if="activeTabId === 'output'" class="pww-log">
      <li v-for="entry in eventLog" :key="entry">{{ entry }}</li>
    </ol>
    <p v-else class="pww-bottom-empty">
      {{ activeNodeId === "validation" ? "2 个 fixture 检查项等待处理。" : "当前 View 没有问题。" }}
    </p>
  </section>
</template>

<style scoped>
.pww-bottom-content { min-height: 100%; padding: 12px 16px; }
.pww-block-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pww-block-kicker { color: var(--pnw-workbench-muted, #64748b); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-log { display: grid; gap: 5px; margin: 0; padding: 9px 9px 9px 28px; border-radius: 6px; background: color-mix(in srgb, var(--pnw-workbench-bg, #f8fafc) 85%, #64748b 15%); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1.45; }
.pww-bottom-empty { margin: 8px 0 0; color: var(--pnw-workbench-muted, #64748b); font-size: 11px; }
</style>
