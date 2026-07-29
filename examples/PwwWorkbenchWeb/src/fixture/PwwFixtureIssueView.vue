<script setup lang="ts">
import { PnwPageHeader } from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

defineProps<PwwFixtureEditorViewProps>();
const emit = defineEmits<{ action: [actionId: string] }>();
</script>

<template>
  <article class="pww-issue-view">
    <PnwPageHeader
      eyebrow="ISSUE-1042 · OPEN"
      :title="view.title"
      subtitle="装配引用无法解析"
      :description="view.description"
      summary="Owner · KT"
    >
      <template #actions>
        <button type="button" @click="emit('action', 'issue.follow')">关注</button>
        <button class="pww-issue-close" type="button" @click="emit('action', 'issue.close')">关闭问题</button>
      </template>
    </PnwPageHeader>

    <section class="pww-issue-body">
      <div class="pww-issue-copy">
        <h2>问题描述</h2>
        <p>子装配引用在当前工作区缺少唯一目标；该 fixture 只演示无侧面 Block 的工程 Issue View。</p>
      </div>
      <dl>
        <div><dt>优先级</dt><dd>High</dd></div>
        <div><dt>里程碑</dt><dd>Workbench 0.6</dd></div>
        <div><dt>更新时间</dt><dd>刚刚</dd></div>
      </dl>
    </section>
  </article>
</template>

<style scoped>
.pww-issue-view { width: min(920px, 100%); margin: 0 auto; padding: clamp(12px, 2vw, 22px); }
.pww-issue-view button { min-height: 30px; padding: 0 12px; border: 1px solid var(--pnw-workbench-border); border-radius: 6px; background: var(--pnw-workbench-surface); color: var(--pnw-workbench-text); cursor: pointer; }
.pww-issue-view .pww-issue-close { border-color: #b91c1c; color: #b91c1c; }
.pww-issue-body { display: grid; grid-template-columns: minmax(0, 1fr) 230px; border: 1px solid var(--pnw-workbench-border); border-top: 0; background: var(--pnw-workbench-surface); }
.pww-issue-copy { padding: 22px; }
.pww-issue-copy h2 { margin-top: 0; font-size: 16px; }
.pww-issue-copy p { color: var(--pnw-workbench-muted); line-height: 1.7; }
.pww-issue-body dl { margin: 0; padding: 14px 18px; border-left: 1px solid var(--pnw-workbench-border); }
.pww-issue-body dl div { padding: 10px 0; border-top: 1px solid var(--pnw-workbench-border); }
.pww-issue-body dl div:first-child { border-top: 0; }
.pww-issue-body dt { color: var(--pnw-workbench-muted); font-size: 10px; }
.pww-issue-body dd { margin: 4px 0 0; font-weight: 700; }
@container pnw-workbench (max-width: 700px) { .pww-issue-body { grid-template-columns: 1fr; } .pww-issue-body dl { border-left: 0; border-top: 1px solid var(--pnw-workbench-border); } }
</style>
