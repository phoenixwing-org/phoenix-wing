<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type {
  PnwFloatingPanelInsets,
  PnwFloatingPanelPosition,
} from "../utils/pnwFloatingPanel.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import {
  pnwClampFloatingPanelPosition,
  pnwNormalizeFloatingPanelInsets,
} from "../utils/pnwFloatingPanel.js";
import {
  pnwResolveWorkbenchOverlayZIndex,
  type PnwWorkbenchOverlayLayer,
} from "../utils/pnwOverlayStacking.js";
import { pnwBindPointerDrag } from "../utils/pnwPointerDrag.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "./PnwIcon.vue";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

const props = withDefaults(defineProps<{
  open: boolean;
  position: PnwFloatingPanelPosition;
  title?: string;
  ariaLabel?: string;
  panelClass?: string;
  constrainMargin?: number;
  /** 在 viewport 内额外避让的 Host Header、Dock 等安全区域。 */
  constrainInsets?: Partial<PnwFloatingPanelInsets>;
  closeOnEscape?: boolean;
  /** 叠层语义；Host 工具浮层应使用公开的 hostTools 层。 */
  layer?: PnwWorkbenchOverlayLayer;
  /** 仅在确有第三方叠层集成时覆盖 layer 的数值。 */
  zIndex?: number;
  /** 显式覆盖全局 overlay scheme；缺省跟随 Host 的 pnwApplyColorScheme。 */
  colorScheme?: PnwColorScheme;
}>(), {
  title: "",
  ariaLabel: "",
  panelClass: "",
  constrainMargin: 8,
  constrainInsets: () => ({}),
  closeOnEscape: true,
  layer: "floatingPanel",
});

const emit = defineEmits<{
  close: [];
  "update:position": [position: PnwFloatingPanelPosition];
}>();

const pnwPanel = ref<HTMLElement>();
let pnwResizeObserver: ResizeObserver | undefined;
const { t: pnwT } = usePnwLocale();
const pnwResolvedTitle = computed(() => props.title || pnwT("floatingPanel.title"));

const pnwPositionStyle = computed(() => {
  const pnwSafeInsets = pnwNormalizeFloatingPanelInsets(props.constrainInsets);
  const pnwSafeTop = pnwSafeInsets.top;
  const pnwSafeRight = pnwSafeInsets.right;
  const pnwSafeBottom = pnwSafeInsets.bottom;
  const pnwSafeLeft = pnwSafeInsets.left;
  return {
    left: `${Number.isFinite(props.position.x) ? props.position.x : pnwSafeLeft + props.constrainMargin}px`,
    top: `${Number.isFinite(props.position.y) ? props.position.y : pnwSafeTop + props.constrainMargin}px`,
    "--pnw-floating-panel-layer-z-index": String(
      pnwResolveWorkbenchOverlayZIndex(props.layer, props.zIndex),
    ),
    "--pnw-floating-panel-available-width": `max(42px, calc(100vw - ${pnwSafeLeft + pnwSafeRight + props.constrainMargin * 2}px))`,
    "--pnw-floating-panel-available-height": `max(42px, calc(100vh - ${pnwSafeTop + pnwSafeBottom + props.constrainMargin * 2}px))`,
  };
});

function pnwConstrainPosition(): void {
  if (!props.open || !pnwPanel.value || typeof window === "undefined") return;
  const rect = pnwPanel.value.getBoundingClientRect();
  const next = pnwClampFloatingPanelPosition(
    props.position,
    { width: rect.width, height: rect.height },
    { width: window.innerWidth, height: window.innerHeight },
    props.constrainMargin,
    props.constrainInsets,
  );
  if (next.x !== props.position.x || next.y !== props.position.y) {
    emit("update:position", next);
  }
}

function pnwStartDrag(event: PointerEvent): void {
  if (!pnwPanel.value) return;
  const startPointer = { x: event.clientX, y: event.clientY };
  const startPosition = { ...props.position };
  const rect = pnwPanel.value.getBoundingClientRect();
  pnwBindPointerDrag(event, {
    cursor: "move",
    onMove: (moveEvent) => {
      const next = pnwClampFloatingPanelPosition(
        {
          x: startPosition.x + moveEvent.clientX - startPointer.x,
          y: startPosition.y + moveEvent.clientY - startPointer.y,
        },
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
        props.constrainMargin,
        props.constrainInsets,
      );
      emit("update:position", next);
    },
    onEnd: pnwConstrainPosition,
  });
}

function pnwHandleKeydown(event: KeyboardEvent): void {
  if (props.open && props.closeOnEscape && event.key === "Escape" && !event.defaultPrevented) {
    event.preventDefault();
    emit("close");
  }
}

watch(
  () => [
    props.open,
    props.position.x,
    props.position.y,
    props.constrainInsets.top,
    props.constrainInsets.right,
    props.constrainInsets.bottom,
    props.constrainInsets.left,
  ],
  async () => {
    await nextTick();
    pnwResizeObserver?.disconnect();
    if (props.open && pnwPanel.value) pnwResizeObserver?.observe(pnwPanel.value);
    pnwConstrainPosition();
  },
);

onMounted(() => {
  window.addEventListener("resize", pnwConstrainPosition);
  window.addEventListener("keydown", pnwHandleKeydown);
  if (typeof ResizeObserver !== "undefined") {
    pnwResizeObserver = new ResizeObserver(pnwConstrainPosition);
    if (pnwPanel.value) pnwResizeObserver.observe(pnwPanel.value);
  }
  void nextTick(pnwConstrainPosition);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", pnwConstrainPosition);
  window.removeEventListener("keydown", pnwHandleKeydown);
  pnwResizeObserver?.disconnect();
});
</script>

<template>
  <Teleport to="body">
    <PnwOverlayThemeProvider
      v-if="open"
      class="pnw-floating-panel-theme-host"
      :color-scheme="colorScheme"
    >
      <section
        ref="pnwPanel"
        class="pnw-floating-panel"
        :class="panelClass"
        :style="pnwPositionStyle"
        role="dialog"
        :aria-label="ariaLabel || pnwResolvedTitle"
      >
        <header class="pnw-floating-panel__header" @pointerdown="pnwStartDrag">
          <slot name="header">
            <strong>{{ pnwResolvedTitle }}</strong>
          </slot>
          <button
            type="button"
            class="pnw-floating-panel__close"
            :aria-label="pnwT('floatingPanel.close')"
            @pointerdown.stop
            @click="emit('close')"
          >
            <PnwIcon name="close" :size="16" />
          </button>
        </header>
        <div class="pnw-floating-panel__content">
          <slot />
        </div>
      </section>
    </PnwOverlayThemeProvider>
  </Teleport>
</template>

<style scoped>
.pnw-floating-panel {
  position: fixed;
  z-index: var(--pnw-floating-panel-z-index, var(--pnw-floating-panel-layer-z-index, 1200));
  width: min(
    var(--pnw-floating-panel-width, 640px),
    var(--pnw-floating-panel-available-width, calc(100vw - 16px))
  );
  max-height: min(
    var(--pnw-floating-panel-max-height, calc(100vh - 16px)),
    var(--pnw-floating-panel-available-height, calc(100vh - 16px))
  );
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-floating-panel-radius, 8px);
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: var(--pnw-overlay-shadow, 0 18px 48px rgba(15, 23, 42, 0.24));
}

.pnw-floating-panel__header {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px 0 14px;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  cursor: move;
  touch-action: none;
  user-select: none;
}

.pnw-floating-panel__header > :first-child {
  flex: 1;
  min-width: 0;
}

.pnw-floating-panel__close {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pnw-floating-panel__close:hover,
.pnw-floating-panel__close:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, rgba(148, 163, 184, 0.16));
}

.pnw-floating-panel__content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
</style>
