<script setup lang="ts">
import { PnwPageHeader } from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

defineProps<PwwFixtureEditorViewProps>();
const emit = defineEmits<{ action: [actionId: string] }>();
</script>

<template>
  <article class="pww-inspection-view">
    <PnwPageHeader
      :eyebrow="view.eyebrow"
      :title="view.title"
      :subtitle="view.subtitle ?? 'BOM-2026-007 · 只读快照'"
      :description="view.description"
      summary="3 项待确认"
    >
      <template #actions>
        <button type="button" @click="emit('action', 'inspection.run')">重新检查</button>
        <button type="button" @click="emit('action', 'inspection.export')">导出报告</button>
      </template>
    </PnwPageHeader>

    <section class="pww-inspection-grid">
      <div><span>对象</span><strong>装配总成</strong><small>MainAssembly</small></div>
      <div><span>基线</span><strong>Revision A.12</strong><small>2026-07-29</small></div>
      <div><span>完整性</span><strong class="is-ready">96%</strong><small>2 个引用待定位</small></div>
      <div><span>所有者</span><strong>KT Engineering</strong><small>本地 fixture</small></div>
    </section>
  </article>
</template>

<style scoped>
.pww-inspection-view { width: min(980px, 100%); margin: 0 auto; padding: clamp(12px, 2vw, 22px); }
.pww-inspection-view button { min-height: 30px; padding: 0 12px; border: 1px solid var(--pnw-workbench-border); border-radius: 6px; background: var(--pnw-workbench-surface); color: var(--pnw-workbench-text); cursor: pointer; }
.pww-inspection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: hidden; border: 1px solid var(--pnw-workbench-border); border-top: 0; background: var(--pnw-workbench-surface); }
.pww-inspection-grid div { display: grid; gap: 5px; padding: 18px; border-right: 1px solid var(--pnw-workbench-border); border-top: 1px solid var(--pnw-workbench-border); }
.pww-inspection-grid span,
.pww-inspection-grid small { color: var(--pnw-workbench-muted); font-size: 10px; }
.pww-inspection-grid .is-ready { color: #15803d; }
@container pnw-workbench (max-width: 700px) { .pww-inspection-grid { grid-template-columns: 1fr; } }
</style>
