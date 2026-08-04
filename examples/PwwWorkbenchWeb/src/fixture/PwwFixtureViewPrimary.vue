<script setup lang="ts">
import {
  PnwPrimaryPanel,
  PnwPrimarySection,
  type PnwActivityBarPresentation,
} from "phoenix-wing";

defineProps<{
  title: string;
  activeNodeId: string;
  presentation: PnwActivityBarPresentation;
  themeSummary: string;
}>();
</script>

<template>
  <PnwPrimaryPanel :title="title">
    <template #summary>PRIMARY · VIEW CONTRIBUTION</template>
    <PnwPrimarySection title="Fixture 筛选">
      <div class="pww-primary-section-content">
        <label class="pww-field">
          <span>Fixture 关键字</span>
          <input value="Phoenix" readonly>
        </label>
      </div>
    </PnwPrimarySection>
    <PnwPrimarySection title="示例项目">
      <div class="pww-primary-section-content pww-tree-fixture">
        <span>▾ 示例项目</span>
        <span>　▾ 子系统 A</span>
        <strong>　　◇ 当前对象</strong>
        <span>　▸ 子系统 B</span>
      </div>
    </PnwPrimarySection>
    <PnwPrimarySection title="当前 View">
      <dl class="pww-primary-section-content pww-primary-properties">
        <div><dt>节点</dt><dd>{{ activeNodeId }}</dd></div>
        <div><dt>模式</dt><dd>{{ presentation }}</dd></div>
        <div><dt>主题</dt><dd>{{ themeSummary }}</dd></div>
        <div><dt>状态</dt><dd>fixture</dd></div>
      </dl>
    </PnwPrimarySection>
  </PnwPrimaryPanel>
</template>

<style scoped>
.pww-primary-section-content { margin: 8px; }
.pww-field { display: grid; gap: 5px; color: var(--pnw-workbench-muted, #64748b); font-size: 10px; }
.pww-field input { width: 100%; height: 30px; padding: 0 8px; border: 1px solid var(--pnw-workbench-border, #dbe3ed); border-radius: 5px; background: var(--pnw-workbench-surface, #fff); color: var(--pnw-workbench-text, #0f172a); }
.pww-tree-fixture { display: grid; gap: 9px; font-size: 12px; }
.pww-tree-fixture span,
.pww-tree-fixture strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pww-primary-properties { display: grid; font-size: 11px; }
.pww-primary-properties div { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 8px; padding: 6px 0; }
.pww-primary-properties dt { color: var(--pnw-workbench-muted, #64748b); }
.pww-primary-properties dd { min-width: 0; margin: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
</style>
