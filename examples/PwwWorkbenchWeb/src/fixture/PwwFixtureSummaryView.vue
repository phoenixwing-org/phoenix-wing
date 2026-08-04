<script setup lang="ts">
import { PnwPageLayout } from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

defineProps<PwwFixtureEditorViewProps>();
defineEmits<{ action: [actionId: string] }>();
</script>

<template>
  <PnwPageLayout
    class="pww-summary-view"
    :eyebrow="view.eyebrow"
    :title="view.title"
    :description="view.description"
    :summary="ribbonSummary"
  >
    <div class="pww-summary-cards">
      <section>
        <span>受控节点</span>
        <strong>{{ activeNodeId }}</strong>
        <small>Ribbon 与 Tree 共用 ID</small>
      </section>
      <section>
        <span>当前呈现</span>
        <strong>{{ presentation }}</strong>
        <small>切换不改变活动 View</small>
      </section>
      <section>
        <span>主题来源</span>
        <strong>{{ themeSummary }}</strong>
        <small>持久化介质由宿主决定</small>
      </section>
    </div>

    <section class="pww-summary-section">
      <span class="pww-summary-kicker">SUMMARY VIEW</span>
      <h2>公开壳层验证</h2>
      <div class="pww-summary-table" role="table" aria-label="Fixture 验证状态">
        <div class="pww-summary-row pww-summary-row--head" role="row">
          <span role="columnheader">场景</span><span role="columnheader">状态</span><span role="columnheader">所有者</span>
        </div>
        <div class="pww-summary-row" role="row">
          <span role="cell">同树双呈现</span><strong role="cell">Ready</strong><span role="cell">Wing</span>
        </div>
        <div class="pww-summary-row" role="row">
          <span role="cell">业务路由</span><em role="cell">Not connected</em><span role="cell">Host</span>
        </div>
      </div>
    </section>
  </PnwPageLayout>
</template>

<style scoped>
.pww-summary-view { width: 100%; margin: 0; padding: 0; }
.pww-summary-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: min(980px, 100%); margin: 0 auto; }
.pww-summary-cards section { min-width: 0; display: grid; gap: 7px; padding: 16px; border: 1px solid var(--pnw-workbench-border); border-radius: 10px; background: var(--pnw-workbench-surface); }
.pww-summary-cards span,
.pww-summary-cards small { overflow: hidden; color: var(--pnw-workbench-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pww-summary-cards strong { overflow: hidden; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.pww-summary-section { width: min(980px, 100%); margin: 28px auto 0; }
.pww-summary-section h2 { margin: 4px 0 14px; font-size: 15px; }
.pww-summary-kicker { color: var(--pnw-workbench-muted); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-summary-table { overflow: hidden; border: 1px solid var(--pnw-workbench-border); border-radius: 9px; background: var(--pnw-workbench-surface); font-size: 12px; }
.pww-summary-row { display: grid; grid-template-columns: 1.5fr 1fr 0.7fr; gap: 12px; padding: 10px 13px; border-top: 1px solid var(--pnw-workbench-border); }
.pww-summary-row--head { border-top: 0; background: color-mix(in srgb, var(--pnw-workbench-surface) 75%, #94a3b8 25%); color: var(--pnw-workbench-muted); font-size: 10px; font-weight: 700; }
.pww-summary-row strong { color: #15803d; }
.pww-summary-row em { color: var(--pnw-workbench-muted); }
@container pnw-workbench (max-width: 840px) { .pww-summary-cards { grid-template-columns: 1fr; } }
</style>
