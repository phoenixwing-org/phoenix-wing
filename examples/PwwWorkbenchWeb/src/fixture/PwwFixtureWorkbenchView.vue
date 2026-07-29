<script setup lang="ts">
import { computed, type Component } from "vue";
import {
  usePnwViewContribution,
  type PnwActivityBarPresentation,
  type PnwDiagnosticsSnapshot,
  type PnwProblemItem,
  type PnwViewBlockComponentContributions,
} from "phoenix-wing";
import type { PwwFixtureViewDefinition } from "./PwwFixtureViewDefinitions.js";
import PwwFixtureCatalogView from "./PwwFixtureCatalogView.vue";
import PwwFixtureCodegenView from "./PwwFixtureCodegenView.vue";
import PwwFixtureInspectionView from "./PwwFixtureInspectionView.vue";
import PwwFixtureIssueView from "./PwwFixtureIssueView.vue";
import PwwFixtureSummaryView from "./PwwFixtureSummaryView.vue";
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
  diagnostics: PnwDiagnosticsSnapshot;
  clearLog: (channel?: string) => void;
  openProblem: (item: PnwProblemItem) => void;
}>();

const emit = defineEmits<{
  action: [actionId: string];
}>();

const pwwEditorComponents: Readonly<Record<PwwFixtureViewDefinition["kind"], Component>> = {
  summary: PwwFixtureSummaryView,
  catalog: PwwFixtureCatalogView,
  codegen: PwwFixtureCodegenView,
  inspection: PwwFixtureInspectionView,
  issue: PwwFixtureIssueView,
};
const pwwEditorComponent = computed(() => pwwEditorComponents[props.view.kind]);

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
  entries: props.diagnostics.logs,
  problems: props.diagnostics.problems,
  onClearLog: props.clearLog,
  onOpenProblem: props.openProblem,
}));
const pwwBottomTabs = computed(() => [
  {
    id: "problems",
    label: "问题",
    count: props.diagnostics.problems.length,
    tone: props.diagnostics.problems.some((item) => item.severity === "error")
      ? "error" as const
      : props.diagnostics.problems.length > 0 ? "warning" as const : "default" as const,
  },
  { id: "output", label: "运行日志", count: props.diagnostics.logs.length },
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
  <component
    :is="pwwEditorComponent"
    :view="view"
    :active-node-id="activeNodeId"
    :presentation="presentation"
    :ribbon-summary="ribbonSummary"
    :theme-summary="themeSummary"
    @action="emit('action', $event)"
  />
</template>
