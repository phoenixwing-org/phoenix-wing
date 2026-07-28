<script setup lang="ts">
import { computed } from "vue";
import {
  usePnwViewContribution,
  type PnwActivityBarPresentation,
  type PnwViewBlockComponentContributions,
} from "phoenix-wing";
import type { PwwFixtureViewDefinition } from "./PwwFixtureViewDefinitions.js";
import PwwFixtureViewBottom from "./PwwFixtureViewBottom.vue";
import PwwFixtureViewPrimary from "./PwwFixtureViewPrimary.vue";
import PwwFixtureViewSecondary from "./PwwFixtureViewSecondary.vue";
import {
  PWW_FIXTURE_VIEW_BLOCK_REGISTRY,
} from "./PwwFixtureViewBlockRegistry.js";

const props = defineProps<{
  view: PwwFixtureViewDefinition;
  activeNodeId: string;
  presentation: PnwActivityBarPresentation;
  ribbonSummary: string;
  themeSummary: string;
  eventLog: readonly string[];
}>();

const pwwPrimaryProps = computed(() => ({
  title: props.view.primaryTitle ?? "Primary",
  activeNodeId: props.activeNodeId,
  presentation: props.presentation,
  themeSummary: props.themeSummary,
}));
const pwwSecondaryProps = computed(() => ({
  title: props.view.secondaryTitle ?? "Secondary",
  activeNodeId: props.activeNodeId,
  presentation: props.presentation,
  themeSummary: props.themeSummary,
}));
const pwwBottomProps = computed(() => ({
  title: props.view.bottomTitle ?? "Bottom",
  activeNodeId: props.activeNodeId,
  eventLog: props.eventLog,
}));
const pwwBottomTabs = computed(() => [
  {
    id: "problems",
    label: "问题",
    count: props.activeNodeId === "validation" ? 2 : 0,
    tone: props.activeNodeId === "validation" ? "warning" as const : "default" as const,
  },
  { id: "output", label: "运行日志", count: props.eventLog.length },
]);

const pwwViewBlocks: PnwViewBlockComponentContributions = {
  ...(props.view.primaryTitle ? {
    primary: { component: PwwFixtureViewPrimary, props: pwwPrimaryProps },
  } : {}),
  ...(props.view.secondaryTitle ? {
    secondary: { component: PwwFixtureViewSecondary, props: pwwSecondaryProps },
  } : {}),
  ...(props.view.bottomTitle ? {
    bottom: {
      component: PwwFixtureViewBottom,
      props: pwwBottomProps,
      tabs: pwwBottomTabs,
    },
  } : {}),
};

// 当前 View 自己登记 Block；App.vue 只按活动 View 动态装配组件。
usePnwViewContribution(
  PWW_FIXTURE_VIEW_BLOCK_REGISTRY,
  () => props.activeNodeId,
  pwwViewBlocks,
);
</script>

<template>
  <article class="pww-editor">
    <div class="pww-editor-meta">
      <span>{{ view.eyebrow }}</span>
      <span>{{ ribbonSummary }}</span>
    </div>
    <h1>{{ view.title }}</h1>
    <p>{{ view.description }}</p>

    <div class="pww-card-grid">
      <section class="pww-card">
        <span>受控节点</span>
        <strong>{{ activeNodeId }}</strong>
        <small>Ribbon 与 Tree 共用 ID</small>
      </section>
      <section class="pww-card">
        <span>当前呈现</span>
        <strong>{{ presentation }}</strong>
        <small>切换不改变活动 View</small>
      </section>
      <section class="pww-card">
        <span>主题来源</span>
        <strong>{{ themeSummary }}</strong>
        <small>持久化介质由宿主决定</small>
      </section>
    </div>

    <section class="pww-editor-section">
      <div>
        <span class="pww-block-kicker">FIXTURE TABLE</span>
        <h2>公开壳层验证</h2>
      </div>
      <div class="pww-table" role="table" aria-label="Fixture 验证状态">
        <div class="pww-table-row pww-table-row--head" role="row">
          <span role="columnheader">场景</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">所有者</span>
        </div>
        <div class="pww-table-row" role="row">
          <span role="cell">同树双呈现</span><strong role="cell">Ready</strong><span role="cell">Wing</span>
        </div>
        <div class="pww-table-row" role="row">
          <span role="cell">业务路由</span><em role="cell">Not connected</em><span role="cell">Host</span>
        </div>
        <div class="pww-table-row" role="row">
          <span role="cell">主题 CSS</span><strong role="cell">Token override</strong><span role="cell">Host</span>
        </div>
      </div>
    </section>
  </article>
</template>

<style scoped>
.pww-editor { width: min(980px, 100%); margin: 0 auto; padding: clamp(20px, 4vw, 44px); }
.pww-editor-meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; color: var(--pnw-workbench-muted, #64748b); font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; }
.pww-editor h1 { margin: 0; font-size: clamp(26px, 4vw, 42px); letter-spacing: -0.035em; }
.pww-editor > p { max-width: 720px; margin: 12px 0 28px; color: var(--pnw-workbench-muted, #64748b); font-size: 14px; line-height: 1.7; }
.pww-card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.pww-card { min-width: 0; display: grid; gap: 7px; padding: 16px; border: 1px solid var(--pnw-workbench-border, #dbe3ed); border-radius: 10px; background: var(--pnw-workbench-surface, #fff); box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05); }
.pww-card span,
.pww-card small { overflow: hidden; color: var(--pnw-workbench-muted, #64748b); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pww-card strong { overflow: hidden; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.pww-editor-section { margin-top: 28px; }
.pww-editor-section h2 { margin: 4px 0 14px; font-size: 15px; }
.pww-block-kicker { color: var(--pnw-workbench-muted, #64748b); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.pww-table { overflow: hidden; border: 1px solid var(--pnw-workbench-border, #dbe3ed); border-radius: 9px; background: var(--pnw-workbench-surface, #fff); font-size: 12px; }
.pww-table-row { display: grid; grid-template-columns: 1.5fr 1fr 0.7fr; gap: 12px; padding: 10px 13px; border-top: 1px solid var(--pnw-workbench-border, #dbe3ed); }
.pww-table-row--head { border-top: 0; background: color-mix(in srgb, var(--pnw-workbench-surface, #fff) 75%, #94a3b8 25%); color: var(--pnw-workbench-muted, #64748b); font-size: 10px; font-weight: 700; text-transform: uppercase; }
.pww-table-row strong { color: #15803d; }
.pww-table-row em { color: var(--pnw-workbench-muted, #64748b); }

@container pnw-workbench (max-width: 840px) {
  .pww-card-grid { grid-template-columns: 1fr; }
}
</style>
