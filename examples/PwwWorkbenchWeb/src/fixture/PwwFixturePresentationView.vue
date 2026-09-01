<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import {
  PnwPageHeader,
  PnwPageMainBlock,
  PnwViewPresentationPortal,
  pnwCreateViewPresentationRecord,
  pnwProvideViewPresentationContext,
  pnwResolveViewPresentationContribution,
  type PnwPresentationFrameDefinition,
} from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";

const props = defineProps<PwwFixtureEditorViewProps>();

const emit = defineEmits<{
  action: [actionId: string];
}>();

const PWW_PRESENTATION_FRAME = {
  ownerKind: "view",
  movable: true,
  resizable: "both",
  recommendedSize: { width: 960, height: 640 },
  minSize: { width: 420, height: 320 },
  rememberBounds: true,
  closeBehavior: "reattach",
} as const satisfies PnwPresentationFrameDefinition;

const pwwContribution = computed(() => pnwResolveViewPresentationContribution(
  props.view.presentation,
  { hasStableOwner: true },
));
const pwwRecord = ref(pnwCreateViewPresentationRecord({
  rendererId: `fixture.${props.activeNodeId}`,
  viewInstanceId: `fixture.${props.activeNodeId}:default`,
  ownerTabId: props.activeNodeId,
  instanceKey: `fixture-${props.activeNodeId}-default`,
}, { frame: props.view.presentation?.frame ?? PWW_PRESENTATION_FRAME }));
const pwwSampleCount = ref("7");
const pwwPortal = ref<InstanceType<typeof PnwViewPresentationPortal>>();

pnwProvideViewPresentationContext({
  mode: computed(() => pwwRecord.value.mode),
  detach: () => pwwPortal.value?.detach(),
  reattach: () => pwwPortal.value?.reattach(),
});

onMounted(() => {
  if (props.view.preferredPresentation !== "floating" || !pwwContribution.value.detachable) return;
  void nextTick(() => pwwPortal.value?.detach());
});
</script>

<template>
  <PnwViewPresentationPortal
    ref="pwwPortal"
    v-model:record="pwwRecord"
    :title="`${view.title} · 完整 View`"
    aria-label="浮出的完整工程 View fixture"
    panel-class="pww-presentation-panel"
    :frame="PWW_PRESENTATION_FRAME"
  >
    <template #main>
      <PnwPageHeader
        class="pww-presentation-header"
        :eyebrow="view.eyebrow"
        :title="view.title"
        :summary="`${activeNodeId} · ${presentation}`"
      >
        <template #actions>
          <button type="button" class="pww-presentation-header-action" @click="emit('action', 'fixture.runtime-check')">
            运行时点检
          </button>
          <button type="button" class="pww-presentation-header-action" @click="emit('action', 'fixture.refresh')">
            刷新全部品牌资源
          </button>
        </template>
      </PnwPageHeader>
      <PnwPageMainBlock class="pww-presentation-main">
        <section class="pww-presentation-toolbar" aria-label="完整 View 工具条">
          <strong>{{ activeNodeId === "result-preview" ? "结果预览 fixture" : "工程分析 fixture" }}</strong>
          <label>
            <span>采样数</span>
            <input v-model="pwwSampleCount" inputmode="numeric" />
          </label>
          <span>{{ ribbonSummary }}</span>
          <button
            v-if="activeNodeId !== 'result-preview'"
            type="button"
            class="pww-presentation-secondary-action"
            @click="emit('action', 'fixture.open-result-floating')"
          >
            打开结果预览
          </button>
        </section>
        <div class="pww-presentation-canvas" role="img" aria-label="工程画布 fixture">
          <span>完整 Main frame</span>
          <strong>{{ pwwSampleCount }} 个采样</strong>
          <small>浮出、缩放并收回后输入值与组件实例保持不变。</small>
        </div>
      </PnwPageMainBlock>
    </template>
  </PnwViewPresentationPortal>
</template>

<style scoped>
.pww-presentation-header {
  width: 100%;
}

.pww-presentation-header-action {
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.pww-presentation-header-action:hover,
.pww-presentation-header-action:focus-visible {
  background: var(--pnw-control-hover-bg, rgba(148, 163, 184, 0.16));
}

.pww-presentation-secondary-action {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pww-presentation-toolbar {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--pnw-workbench-border, #dbe3ed);
}

.pww-presentation-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pnw-workbench-muted, #64748b);
}

.pww-presentation-toolbar input {
  width: 48px;
  height: 26px;
  box-sizing: border-box;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 4px;
  padding: 0 6px;
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
}

.pww-presentation-canvas {
  min-height: 360px;
  display: grid;
  place-content: center;
  gap: 9px;
  color: var(--pnw-workbench-muted, #64748b);
  text-align: center;
  background:
    linear-gradient(var(--pnw-workbench-border, #dbe3ed) 1px, transparent 1px),
    linear-gradient(90deg, var(--pnw-workbench-border, #dbe3ed) 1px, transparent 1px);
  background-size: 24px 24px;
}

.pww-presentation-canvas strong {
  color: var(--pnw-workbench-text, #0f172a);
  font-size: 22px;
}

:global(.pww-presentation-panel .pnw-floating-panel__content) {
  overflow: hidden;
}
</style>
