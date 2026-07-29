<script setup lang="ts">
import { PnwPageHeader } from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

defineProps<PwwFixtureEditorViewProps>();
const emit = defineEmits<{ action: [actionId: string] }>();
</script>

<template>
  <article class="pww-catalog-view">
    <PnwPageHeader
      :eyebrow="view.eyebrow"
      :title="view.title"
      subtitle="装配工程 / 子系统 A"
      :summary="`${activeNodeId} · ${themeSummary}`"
    >
      <template #actions>
        <button type="button" @click="emit('action', 'catalog.refresh')">刷新</button>
        <button type="button" @click="emit('action', 'catalog.expand-all')">全部展开</button>
      </template>
    </PnwPageHeader>

    <div class="pww-catalog-content">
      <nav aria-label="模型目录 fixture">
        <strong>装配工程</strong>
        <span>▾ 子系统 A</span>
        <span class="is-active">　◇ 主模型</span>
        <span>　◇ 参考模型</span>
        <span>▸ 子系统 B</span>
      </nav>
      <section>
        <span class="pww-catalog-kicker">SELECTED MODEL</span>
        <h2>主模型</h2>
        <p>{{ view.description }}</p>
        <dl>
          <div><dt>文件</dt><dd>MainAssembly.CATProduct</dd></div>
          <div><dt>版本</dt><dd>A.12</dd></div>
          <div><dt>状态</dt><dd>可编辑</dd></div>
        </dl>
      </section>
    </div>
  </article>
</template>

<style scoped>
.pww-catalog-view { min-width: 0; padding: 12px; }
.pww-catalog-view button { min-height: 30px; padding: 0 12px; border: 1px solid var(--pnw-workbench-border); border-radius: 6px; background: var(--pnw-workbench-surface); color: var(--pnw-workbench-text); cursor: pointer; }
.pww-catalog-content { display: grid; grid-template-columns: minmax(180px, 0.7fr) minmax(280px, 1.3fr); min-height: 320px; border: 1px solid var(--pnw-workbench-border); border-top: 0; background: var(--pnw-workbench-surface); }
.pww-catalog-content nav { display: grid; align-content: start; gap: 4px; padding: 16px; border-right: 1px solid var(--pnw-workbench-border); }
.pww-catalog-content nav span { padding: 7px 8px; border-radius: 5px; color: var(--pnw-workbench-muted); }
.pww-catalog-content nav .is-active { background: color-mix(in srgb, #2563eb 12%, transparent); color: #2563eb; font-weight: 700; }
.pww-catalog-content section { padding: 22px; }
.pww-catalog-content h2 { margin: 5px 0 8px; }
.pww-catalog-content p { max-width: 620px; color: var(--pnw-workbench-muted); }
.pww-catalog-kicker { color: var(--pnw-workbench-muted); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-catalog-content dl { display: grid; gap: 0; margin-top: 24px; }
.pww-catalog-content dl div { display: grid; grid-template-columns: 90px 1fr; padding: 9px 0; border-top: 1px solid var(--pnw-workbench-border); }
.pww-catalog-content dt { color: var(--pnw-workbench-muted); }
.pww-catalog-content dd { margin: 0; font-weight: 600; }
@container pnw-workbench (max-width: 700px) { .pww-catalog-content { grid-template-columns: 1fr; } .pww-catalog-content nav { border-right: 0; border-bottom: 1px solid var(--pnw-workbench-border); } }
</style>
