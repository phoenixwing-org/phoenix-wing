<script setup lang="ts">
import type { PnwActivityBarPresentation } from "phoenix-wing";

defineProps<{
  title: string;
  activeNodeId: string;
  presentation: PnwActivityBarPresentation;
  themeSummary: string;
}>();
</script>

<template>
  <section class="pww-block-content">
    <span class="pww-block-kicker">SECONDARY · VIEW CONTRIBUTION</span>
    <h2>{{ title }}</h2>
    <dl class="pww-properties">
      <div><dt>节点</dt><dd>{{ activeNodeId }}</dd></div>
      <div><dt>模式</dt><dd>{{ presentation }}</dd></div>
      <div><dt>主题</dt><dd>{{ themeSummary }}</dd></div>
      <div><dt>状态</dt><dd>fixture</dd></div>
    </dl>
  </section>
</template>

<style scoped>
.pww-block-content { min-width: 190px; padding: 16px 14px; }
.pww-block-kicker { color: var(--pnw-workbench-muted, #64748b); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-properties { display: grid; gap: 0; margin: 18px 0 0; font-size: 11px; }
.pww-properties div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--pnw-workbench-border, #dbe3ed); }
.pww-properties dt { color: var(--pnw-workbench-muted, #64748b); }
.pww-properties dd { min-width: 0; margin: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
</style>
