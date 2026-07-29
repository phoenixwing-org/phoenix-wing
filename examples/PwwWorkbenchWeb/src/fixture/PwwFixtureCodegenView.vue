<script setup lang="ts">
import { PnwPageHeader } from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

defineProps<PwwFixtureEditorViewProps>();
const emit = defineEmits<{ action: [actionId: string] }>();

const pwwCodegenTools = ["自适应", "排序", "复制", "粘贴", "＋ 插入", "▣ 副本", "↑", "↓", "－ 删除"] as const;
</script>

<template>
  <article class="pww-codegen-view">
    <PnwPageHeader
      :title="view.title"
      :subtitle="view.subtitle"
      :description="view.description"
      :toolbar="false"
    >
      <template #actions>
        <button type="button" @click="emit('action', 'codegen.preview')">预检</button>
        <button type="button" @click="emit('action', 'codegen.apply-source')">Apply 源码</button>
        <button type="button" disabled>还原</button>
        <button class="pww-codegen-primary" type="button" @click="emit('action', 'codegen.save-json')">保存 JSON</button>
      </template>
    </PnwPageHeader>

    <div class="pww-codegen-toolbar" role="toolbar" aria-label="参数表工具">
      <strong>参数表</strong>
      <button
        v-for="tool in pwwCodegenTools"
        :key="tool"
        type="button"
        :disabled="tool === '粘贴'"
        @click="emit('action', `codegen.tool.${tool}`)"
      >{{ tool }}</button>
    </div>

    <div class="pww-codegen-table" role="table" aria-label="参数代码 fixture">
      <div class="pww-codegen-row pww-codegen-row--head" role="row">
        <span>参数名</span><span>类型</span><span>方向</span><span>默认值</span>
      </div>
      <div class="pww-codegen-row" role="row">
        <strong>partNumber</strong><span>CATUnicodeString</span><span>Input</span><code>"PNX-001"</code>
      </div>
      <div class="pww-codegen-row" role="row">
        <strong>revision</strong><span>int</span><span>Input</span><code>1</code>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pww-codegen-view { min-width: 0; padding: 10px 14px 20px; }
.pww-codegen-view :deep(.pnw-page-head) { min-height: 64px; padding-inline: 14px; background: var(--pnw-workbench-surface); }
.pww-codegen-view :deep(.pnw-head-actions) { gap: 8px; }
.pww-codegen-view button { min-height: 30px; padding: 0 12px; border: 1px solid var(--pnw-workbench-border); border-radius: 6px; background: var(--pnw-workbench-surface); color: var(--pnw-workbench-text); font: inherit; cursor: pointer; white-space: nowrap; }
.pww-codegen-view button:disabled { color: var(--pnw-workbench-muted); cursor: not-allowed; }
.pww-codegen-view .pww-codegen-primary { border-color: #2563eb; background: #2563eb; color: #fff; }
.pww-codegen-toolbar { display: flex; min-width: 0; align-items: center; gap: 4px; overflow-x: auto; padding: 8px 12px; border-bottom: 1px solid var(--pnw-workbench-border); background: color-mix(in srgb, var(--pnw-workbench-surface) 92%, var(--pnw-workbench-muted) 8%); }
.pww-codegen-toolbar strong { margin-right: auto; padding-right: 18px; white-space: nowrap; }
.pww-codegen-toolbar button { border-color: transparent; background: transparent; }
.pww-codegen-table { min-width: 620px; margin: 14px 12px; overflow: hidden; border: 1px solid var(--pnw-workbench-border); border-radius: 8px; background: var(--pnw-workbench-surface); }
.pww-codegen-row { display: grid; grid-template-columns: 1.3fr 1.4fr 0.8fr 1fr; gap: 12px; padding: 11px 14px; border-top: 1px solid var(--pnw-workbench-border); font-size: 12px; }
.pww-codegen-row--head { border-top: 0; color: var(--pnw-workbench-muted); font-weight: 700; }
@container pnw-workbench (max-width: 840px) {
  .pww-codegen-view { overflow-x: auto; padding-inline: 6px; }
  .pww-codegen-view :deep(.pnw-page-head) { min-width: 620px; }
}
</style>
