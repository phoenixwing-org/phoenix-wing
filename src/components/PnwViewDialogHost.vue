<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  shallowRef,
  type Component,
} from "vue";
import type {
  PnwResolvedViewDialogHostRequest,
  PnwViewDialogHostController,
  PnwViewDialogHostEntry,
  PnwViewDialogRendererContext,
} from "../types/PnwViewDialogHost.js";
import type {
  PnwFloatingPanelBounds,
  PnwFloatingPanelPosition,
  PnwFloatingPanelSize,
} from "../utils/pnwFloatingPanel.js";
import type { PnwFloatingWindowStackController } from "../utils/pnwFloatingWindowStack.js";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";

const props = withDefaults(defineProps<{
  controller: PnwViewDialogHostController;
  /** 测试或隔离 renderer 可注入；缺省复用 Document 级统一 presentation stack。 */
  stack?: PnwFloatingWindowStackController;
  /** 全局 Host 卸载等价于父宿主销毁，默认 settle 全部请求。 */
  closeOnUnmount?: boolean;
}>(), {
  closeOnUnmount: true,
});

const pnwEntries = shallowRef<readonly PnwViewDialogHostEntry[]>([]);
const pnwContexts = new Map<string, PnwViewDialogRendererContext>();
const pnwPanelHandles = new Map<string, { focus(): void }>();
const pnwFocusRevisions = new Map<string, number>();
const pnwUnsubscribe = props.controller.subscribe((entries) => {
  const focusIds = entries
    .filter((entry) => pnwFocusRevisions.get(entry.request.requestId) !== entry.focusRevision)
    .map((entry) => entry.request.requestId);
  pnwEntries.value = entries;
  const activeIds = new Set(entries.map((entry) => entry.request.requestId));
  for (const requestId of pnwContexts.keys()) {
    if (!activeIds.has(requestId)) pnwContexts.delete(requestId);
  }
  for (const entry of entries) {
    pnwFocusRevisions.set(entry.request.requestId, entry.focusRevision);
  }
  for (const requestId of [...pnwFocusRevisions.keys()]) {
    if (!activeIds.has(requestId)) pnwFocusRevisions.delete(requestId);
  }
  if (focusIds.length > 0) {
    void nextTick(() => {
      for (const requestId of focusIds) pnwPanelHandles.get(requestId)?.focus();
    });
  }
});

function pnwSetPanelHandle(requestId: string, panel: unknown): void {
  if (panel && typeof (panel as { focus?: unknown }).focus === "function") {
    pnwPanelHandles.set(requestId, panel as { focus(): void });
  } else {
    pnwPanelHandles.delete(requestId);
  }
}

function pnwResolveComponent(entry: PnwViewDialogHostEntry): Component | undefined {
  return props.controller.resolveRenderer(entry.request.rendererId)?.component;
}

function pnwRendererContext(entry: PnwViewDialogHostEntry): PnwViewDialogRendererContext {
  const existing = pnwContexts.get(entry.request.requestId);
  if (existing?.request === entry.request) return existing;
  const context: PnwViewDialogRendererContext = {
    request: entry.request,
    props: entry.request.props,
    submit: (value) => props.controller.submit(entry.request.requestId, value),
    cancel: () => { void props.controller.cancel(entry.request.requestId); },
  };
  pnwContexts.set(entry.request.requestId, context);
  return context;
}

function pnwUpdatePosition(
  entry: PnwViewDialogHostEntry,
  position: PnwFloatingPanelPosition,
): void {
  props.controller.updateBounds(entry.request.requestId, { position, size: entry.bounds.size });
}

function pnwUpdateSize(entry: PnwViewDialogHostEntry, size: PnwFloatingPanelSize): void {
  props.controller.updateBounds(entry.request.requestId, { position: entry.bounds.position, size });
}

function pnwUpdateBounds(entry: PnwViewDialogHostEntry, bounds: PnwFloatingPanelBounds): void {
  props.controller.updateBounds(entry.request.requestId, bounds);
}

function pnwClose(request: PnwResolvedViewDialogHostRequest): void {
  void props.controller.close(request.requestId, "window-close");
}

onBeforeUnmount(() => {
  pnwUnsubscribe();
  if (props.closeOnUnmount) void props.controller.closeAll("parent-close");
});
</script>

<template>
  <template v-for="entry in pnwEntries" :key="entry.request.requestId">
    <PnwFloatingPanel
      :ref="(panel) => pnwSetPanelHandle(entry.request.requestId, panel)"
      :open="true"
      :position="entry.bounds.position"
      :size="entry.bounds.size"
      :title="entry.request.title"
      :aria-label="entry.request.title"
      :presentation-id="`view-dialog:${entry.request.requestId}`"
      :stack="stack"
      :movable="controller.resolveRenderer(entry.request.rendererId)?.movable ?? true"
      :resizable="controller.resolveRenderer(entry.request.rendererId)?.resizable ?? 'both'"
      :recommended-size="entry.request.size"
      :min-size="{
        width: entry.request.size.minWidth,
        height: entry.request.size.minHeight,
      }"
      :max-size="{
        width: entry.request.size.maxWidth,
        height: entry.request.size.maxHeight,
      }"
      :color-scheme="entry.request.colorScheme"
      layer="presentation"
      owner-kind="view"
      panel-class="pnw-view-dialog-host__panel"
      @close="pnwClose(entry.request)"
      @update:position="pnwUpdatePosition(entry, $event)"
      @update:size="pnwUpdateSize(entry, $event)"
      @update:bounds="pnwUpdateBounds(entry, $event)"
    >
      <div
        class="pnw-view-dialog-host__content"
        :data-pnw-view-dialog-request-id="entry.request.requestId"
        :data-pnw-view-dialog-renderer-id="entry.request.rendererId"
      >
        <component
          :is="pnwResolveComponent(entry)"
          v-if="pnwResolveComponent(entry)"
          :dialog="pnwRendererContext(entry)"
        />
      </div>
    </PnwFloatingPanel>
  </template>
</template>

<style scoped>
.pnw-view-dialog-host__content {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

:global(.pnw-floating-panel.pnw-view-dialog-host__panel) {
  --pnw-floating-panel-width: 720px;
}
</style>
