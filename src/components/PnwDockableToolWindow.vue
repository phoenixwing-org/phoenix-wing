<script setup lang="ts">
import { computed } from "vue";
import type {
  PnwDockableToolCommand,
  PnwDockableToolDefinition,
  PnwDockableToolState,
} from "../types/PnwDockableTool.js";
import type {
  PnwFloatingPanelBounds,
  PnwFloatingPanelInsets,
  PnwFloatingPanelPosition,
  PnwFloatingPanelSize,
} from "../utils/pnwFloatingPanel.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchOverlayLayer } from "../utils/pnwOverlayStacking.js";
import {
  pnwIsDockableToolVisible,
  pnwReduceDockableToolState,
} from "../utils/pnwDockableTool.js";
import { pnwResolvePresentationFrameDefinition } from "../utils/pnwPresentationFrame.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  definition: PnwDockableToolDefinition;
  state: PnwDockableToolState;
  activeViewId?: string;
  panelClass?: string;
  constrainMargin?: number;
  constrainInsets?: Partial<PnwFloatingPanelInsets>;
  closeOnEscape?: boolean;
  layer?: PnwWorkbenchOverlayLayer;
  zIndex?: number;
  colorScheme?: PnwColorScheme;
}>(), {
  activeViewId: "",
  panelClass: "",
  constrainMargin: 8,
  constrainInsets: () => ({}),
  closeOnEscape: true,
  layer: "presentation",
});

const emit = defineEmits<{
  "update:state": [state: PnwDockableToolState];
  dockPrimary: [];
  close: [];
  "update:position": [position: PnwFloatingPanelPosition];
  "update:size": [size: PnwFloatingPanelSize];
  "update:bounds": [bounds: PnwFloatingPanelBounds];
}>();

const { t: pnwT } = usePnwLocale();
const pnwVisible = computed(() => (
  props.state.mode === "floating"
  && pnwIsDockableToolVisible(props.definition, props.state, props.activeViewId)
));
const pnwFrame = computed(() => pnwResolvePresentationFrameDefinition(
  props.definition.frame,
  "tool",
));

function pnwApply(command: PnwDockableToolCommand): void {
  emit("update:state", pnwReduceDockableToolState(props.state, command));
}

function pnwDockPrimary(): void {
  pnwApply({ type: "dock-primary" });
  emit("dockPrimary");
}

function pnwClose(): void {
  pnwApply({ type: "close" });
  emit("close");
}

function pnwUpdatePosition(position: PnwFloatingPanelPosition): void {
  if (pnwFrame.value.resizable !== false) return;
  pnwApply({ type: "set-floating-position", position });
  emit("update:position", position);
}

function pnwUpdateBounds(bounds: PnwFloatingPanelBounds): void {
  const positioned = pnwReduceDockableToolState(props.state, {
    type: "set-floating-position",
    position: bounds.position,
  });
  const sized = pnwReduceDockableToolState(positioned, {
    type: "set-floating-size",
    size: bounds.size,
  });
  emit("update:state", sized);
  emit("update:position", bounds.position);
  emit("update:size", bounds.size);
  emit("update:bounds", bounds);
}
</script>

<template>
  <PnwFloatingPanel
    v-if="pnwVisible"
    :open="true"
    :position="state.floatingPosition"
    :size="state.floatingSize || pnwFrame.recommendedSize"
    :movable="pnwFrame.movable"
    :resizable="pnwFrame.resizable"
    :recommended-size="pnwFrame.recommendedSize"
    :remember-bounds="pnwFrame.rememberBounds"
    :min-size="pnwFrame.minSize"
    :max-size="pnwFrame.maxSize"
    :presentation-id="definition.id"
    owner-kind="tool"
    :title="definition.title"
    :aria-label="definition.ariaLabel || definition.title"
    :panel-class="['pnw-dockable-tool-window', panelClass].filter(Boolean).join(' ')"
    :constrain-margin="constrainMargin"
    :constrain-insets="constrainInsets"
    :close-on-escape="closeOnEscape"
    :layer="layer"
    :z-index="zIndex"
    :color-scheme="colorScheme"
    @close="pnwClose"
    @update:position="pnwUpdatePosition"
    @update:bounds="pnwUpdateBounds"
  >
    <template #header>
      <div class="pnw-dockable-tool-window__header-content">
        <strong class="pnw-dockable-tool-window__title">
          <slot name="title">{{ definition.title }}</slot>
        </strong>
        <button
          type="button"
          class="pnw-dockable-tool-action"
          :title="pnwT('dockableTool.dockPrimary')"
          :aria-label="pnwT('dockableTool.dockPrimary')"
          @pointerdown.stop
          @click="pnwDockPrimary"
        >
          <PnwIcon name="panel-left" :size="16" />
        </button>
      </div>
    </template>
    <slot />
  </PnwFloatingPanel>
</template>

<style scoped>
.pnw-dockable-tool-window__header-content {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pnw-dockable-tool-window__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-dockable-tool-action {
  width: 26px;
  height: 26px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

.pnw-dockable-tool-action:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-dockable-tool-action:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}
</style>
