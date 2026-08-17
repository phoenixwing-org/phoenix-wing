<script setup lang="ts">
import {
  PnwDockableToolWindow,
  PnwPageHeader,
  PnwPageMainBlock,
  pnwReduceDockableToolState,
} from "phoenix-wing";
import type { PwwFixtureEditorViewProps } from "./PwwFixtureEditorView.js";
import {
  PWW_FIXTURE_RESOURCE_TOOL,
  pwwFixtureResourceToolState,
} from "./PwwFixtureResourceToolState.js";

defineProps<PwwFixtureEditorViewProps>();

function pwwOpenResourceLibrary(): void {
  pwwFixtureResourceToolState.value = pnwReduceDockableToolState(
    pwwFixtureResourceToolState.value,
    { type: "open-floating" },
  );
}
</script>

<template>
  <PnwPageHeader
    :eyebrow="view.eyebrow"
    :title="view.title"
    summary="Tool owner：浮出与 Primary 停靠使用独立生命周期"
  >
    <template #actions>
      <button type="button" class="pww-resource-open" @click="pwwOpenResourceLibrary">
        打开工程资源库
      </button>
    </template>
  </PnwPageHeader>
  <PnwPageMainBlock>
    <p>该 fixture 只声明 frame capability；拖动、缩放、记忆 bounds、置顶和主题由 Wing 提供。</p>
  </PnwPageMainBlock>
  <PnwDockableToolWindow
    v-model:state="pwwFixtureResourceToolState"
    :definition="PWW_FIXTURE_RESOURCE_TOOL"
    :active-view-id="activeNodeId"
  >
    <div class="pww-resource-tool-body">
      <strong>工程资源库 fixture</strong>
      <input value="workspace://fixture/resources/sample.dat" readonly>
      <small>可缩放、停靠 Primary 或关闭；业务内容不进入 Wing。</small>
    </div>
  </PnwDockableToolWindow>
</template>

<style scoped>
.pww-resource-open {
  min-height: 28px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: var(--pnw-control-bg, transparent);
  color: inherit;
  cursor: pointer;
}

.pww-resource-tool-body {
  min-height: 260px;
  display: grid;
  align-content: start;
  gap: 10px;
  box-sizing: border-box;
  padding: 12px;
  color: var(--pnw-workbench-text, #0f172a);
}

.pww-resource-tool-body input {
  height: 30px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  padding: 0 8px;
  background: var(--pnw-workbench-surface, #fff);
  color: inherit;
}

.pww-resource-tool-body small { color: var(--pnw-workbench-muted, #64748b); }
</style>
