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
    <span class="pww-block-kicker">PRIMARY · VIEW CONTRIBUTION</span>
    <h2>{{ title }}</h2>
    <label class="pww-field">
      <span>Fixture 关键字</span>
      <input value="Phoenix" readonly>
    </label>
    <div class="pww-tree-fixture">
      <span>▾ 示例项目</span>
      <span>　▾ 子系统 A</span>
      <strong>　　◇ 当前对象</strong>
      <span>　▸ 子系统 B</span>
    </div>
    <div class="pww-primary-properties">
      <span class="pww-block-kicker">当前 View</span>
      <dl>
        <div><dt>节点</dt><dd>{{ activeNodeId }}</dd></div>
        <div><dt>模式</dt><dd>{{ presentation }}</dd></div>
        <div><dt>主题</dt><dd>{{ themeSummary }}</dd></div>
        <div><dt>状态</dt><dd>fixture</dd></div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.pww-block-content { min-width: 190px; padding: 16px 14px; }
.pww-block-kicker { color: var(--pnw-workbench-muted, #64748b); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-field { display: grid; gap: 5px; margin: 18px 0; color: var(--pnw-workbench-muted, #64748b); font-size: 10px; }
.pww-field input { width: 100%; height: 30px; padding: 0 8px; border: 1px solid var(--pnw-workbench-border, #dbe3ed); border-radius: 5px; background: var(--pnw-workbench-surface, #fff); color: var(--pnw-workbench-text, #0f172a); }
.pww-tree-fixture { display: grid; gap: 9px; font-size: 12px; }
.pww-tree-fixture span,
.pww-tree-fixture strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pww-primary-properties { margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--pnw-workbench-border, #dbe3ed); }
.pww-primary-properties dl { display: grid; margin: 8px 0 0; font-size: 11px; }
.pww-primary-properties dl div { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 8px; padding: 6px 0; }
.pww-primary-properties dt { color: var(--pnw-workbench-muted, #64748b); }
.pww-primary-properties dd { min-width: 0; margin: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
</style>
