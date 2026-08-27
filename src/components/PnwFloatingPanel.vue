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
  PnwFloatingPanelBounds,
  PnwFloatingPanelInsets,
  PnwFloatingPanelPosition,
  PnwFloatingPanelResizeDirection,
  PnwFloatingPanelSize,
  PnwFloatingPanelSizeConstraints,
} from "../utils/pnwFloatingPanel.js";
import type { PnwPresentationResizeMode } from "../types/PnwPresentationFrame.js";
import type { PnwPresentationOwnerKind } from "../types/PnwPresentationFrame.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwIconName } from "../icons/pnwIconCatalog.js";
import {
  pnwClampFloatingPanelPosition,
  pnwClampFloatingPanelBounds,
  pnwNormalizeFloatingPanelInsets,
  pnwResizeFloatingPanelBounds,
} from "../utils/pnwFloatingPanel.js";
import {
  pnwResolveWorkbenchOverlayZIndex,
  type PnwWorkbenchOverlayLayer,
} from "../utils/pnwOverlayStacking.js";
import type { PnwFloatingWindowStackController } from "../utils/pnwFloatingWindowStack.js";
import { pnwGetDocumentFloatingWindowStack } from "../utils/pnwFloatingWindowStack.js";
import { pnwBindPointerDrag } from "../utils/pnwPointerDrag.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import type { PnwLocaleMessageKey } from "../utils/pnwLocale.js";
import PnwIcon from "./PnwIcon.vue";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

let PNW_FLOATING_PANEL_INSTANCE_SEQUENCE = 0;

const props = withDefaults(defineProps<{
  open: boolean;
  position: PnwFloatingPanelPosition;
  /** 可选受控首选尺寸；超出 viewport 时仍由 max-width/max-height 约束。 */
  size?: Partial<PnwFloatingPanelSize>;
  /** 完全受控 resize；true 兼容等价于 both。 */
  resizable?: boolean | PnwPresentationResizeMode;
  movable?: boolean;
  recommendedSize?: Partial<PnwFloatingPanelSize>;
  rememberBounds?: boolean;
  minSize?: Partial<PnwFloatingPanelSize>;
  maxSize?: Partial<PnwFloatingPanelSize>;
  /** 同一 renderer 浮窗栈中的稳定身份；Tool/View 应传业务无关的实例 ID。 */
  presentationId?: string;
  /** 缺省使用当前 Document 的共享栈；测试或隔离宿主可显式传入。 */
  stack?: PnwFloatingWindowStackController;
  ownerKind?: PnwPresentationOwnerKind;
  /** 统一浮动窗口菜单的“收回”动作；Tool 可不提供。 */
  requestReattach?: () => void;
  title?: string;
  ariaLabel?: string;
  panelClass?: string;
  constrainMargin?: number;
  /** 在 viewport 内额外避让的 Host Header、Dock 等安全区域。 */
  constrainInsets?: Partial<PnwFloatingPanelInsets>;
  closeOnEscape?: boolean;
  /** 是否显示内置关闭动作；需要自定义生命周期的 owner 可通过 actions slot 分离动作。 */
  showCloseAction?: boolean;
  /** 关闭语义图标；完整 View 可改用 editor-restore 明确表示收回。 */
  closeIcon?: PnwIconName;
  /** 覆盖关闭按钮的 title/aria-label；空值使用通用“关闭浮动面板”。 */
  closeLabel?: string;
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
  showCloseAction: true,
  closeIcon: "close",
  closeLabel: "",
  resizable: false,
  movable: true,
  rememberBounds: true,
  presentationId: "",
  layer: "floatingPanel",
});

const emit = defineEmits<{
  close: [];
  "update:position": [position: PnwFloatingPanelPosition];
  "update:size": [size: PnwFloatingPanelSize];
  "update:bounds": [bounds: PnwFloatingPanelBounds];
  activate: [presentationId: string];
  resetToRecommendedSize: [size: PnwFloatingPanelSize];
}>();

const pnwPanel = ref<HTMLElement>();
const pnwInternalPresentationId = `pnw-floating-panel-${++PNW_FLOATING_PANEL_INSTANCE_SEQUENCE}`;
const pnwStackZIndex = ref<number>();
const pnwStackActive = ref(false);
const pnwOptimisticBounds = ref<PnwFloatingPanelBounds>();
let pnwResizeObserver: ResizeObserver | undefined;
let pnwUnregisterStack: (() => void) | undefined;
let pnwUnsubscribeStack: (() => void) | undefined;
const { t: pnwT } = usePnwLocale();
const pnwResolvedTitle = computed(() => props.title || pnwT("floatingPanel.title"));
const pnwResolvedCloseLabel = computed(() => props.closeLabel || pnwT("floatingPanel.close"));
const pnwResolvedPresentationId = computed(() => props.presentationId.trim() || pnwInternalPresentationId);
const pnwResizeMode = computed<PnwPresentationResizeMode>(() => (
  props.resizable === true ? "both" : props.resizable || false
));
const pnwResizeDirections: readonly PnwFloatingPanelResizeDirection[] = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];
const pnwEnabledResizeDirections = computed<readonly PnwFloatingPanelResizeDirection[]>(() => {
  if (pnwResizeMode.value === "both") return pnwResizeDirections;
  if (pnwResizeMode.value === "horizontal") return ["east", "west"];
  if (pnwResizeMode.value === "vertical") return ["north", "south"];
  return [];
});
const pnwResizeLabels = {
  north: "floatingPanel.resizeNorth",
  "north-east": "floatingPanel.resizeNorthEast",
  east: "floatingPanel.resizeEast",
  "south-east": "floatingPanel.resizeSouthEast",
  south: "floatingPanel.resizeSouth",
  "south-west": "floatingPanel.resizeSouthWest",
  west: "floatingPanel.resizeWest",
  "north-west": "floatingPanel.resizeNorthWest",
} as const satisfies Record<PnwFloatingPanelResizeDirection, PnwLocaleMessageKey>;

const pnwPositionStyle = computed(() => {
  const pnwSafeInsets = pnwNormalizeFloatingPanelInsets(props.constrainInsets);
  const pnwSafeTop = pnwSafeInsets.top;
  const pnwSafeRight = pnwSafeInsets.right;
  const pnwSafeBottom = pnwSafeInsets.bottom;
  const pnwSafeLeft = pnwSafeInsets.left;
  const pnwStyle: Record<string, string> = {
    left: `${Number.isFinite(props.position.x) ? props.position.x : pnwSafeLeft + props.constrainMargin}px`,
    top: `${Number.isFinite(props.position.y) ? props.position.y : pnwSafeTop + props.constrainMargin}px`,
    "--pnw-floating-panel-layer-z-index": String(pnwStackZIndex.value
      ?? pnwResolveWorkbenchOverlayZIndex(props.layer, props.zIndex)),
    "--pnw-floating-panel-available-width": `max(42px, calc(100vw - ${pnwSafeLeft + pnwSafeRight + props.constrainMargin * 2}px))`,
    "--pnw-floating-panel-available-height": `max(42px, calc(100vh - ${pnwSafeTop + pnwSafeBottom + props.constrainMargin * 2}px))`,
  };
  if (typeof props.size?.width === "number" && Number.isFinite(props.size.width) && props.size.width > 0) {
    pnwStyle["--pnw-floating-panel-width"] = `${props.size.width}px`;
  }
  if (typeof props.size?.height === "number" && Number.isFinite(props.size.height) && props.size.height > 0) {
    pnwStyle.height = `${props.size.height}px`;
  }
  return pnwStyle;
});

function pnwConstrainPosition(): void {
  if (!props.open || !pnwPanel.value || typeof window === "undefined") return;
  if (props.resizable) {
    const nextBounds = pnwCurrentBounds();
    if (nextBounds && (
      nextBounds.position.x !== props.position.x
      || nextBounds.position.y !== props.position.y
      || nextBounds.size.width !== props.size?.width
      || nextBounds.size.height !== props.size?.height
    )) pnwEmitBounds(nextBounds);
    return;
  }
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

function pnwSizeConstraints(): PnwFloatingPanelSizeConstraints {
  return {
    minWidth: props.minSize?.width,
    minHeight: props.minSize?.height,
    maxWidth: props.maxSize?.width,
    maxHeight: props.maxSize?.height,
  };
}

function pnwCurrentBounds(): PnwFloatingPanelBounds | undefined {
  if (!pnwPanel.value) return undefined;
  if (pnwOptimisticBounds.value) return pnwOptimisticBounds.value;
  const rect = pnwPanel.value.getBoundingClientRect();
  return pnwClampFloatingPanelBounds(
    {
      position: props.position,
      size: {
        width: pnwPositiveSize(props.size?.width, rect.width),
        height: pnwPositiveSize(props.size?.height, rect.height),
      },
    },
    { width: window.innerWidth, height: window.innerHeight },
    pnwSizeConstraints(),
    props.constrainMargin,
    props.constrainInsets,
  );
}

function pnwPositiveSize(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function pnwEmitBounds(bounds: PnwFloatingPanelBounds): void {
  pnwOptimisticBounds.value = bounds;
  emit("update:bounds", bounds);
  if (bounds.position.x !== props.position.x || bounds.position.y !== props.position.y) {
    emit("update:position", bounds.position);
  }
  if (bounds.size.width !== props.size?.width || bounds.size.height !== props.size?.height) {
    emit("update:size", bounds.size);
  }
}

function pnwStartDrag(event: PointerEvent): void {
  if (!props.movable || !pnwPanel.value) return;
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
      emit("update:bounds", {
        position: next,
        size: { width: rect.width, height: rect.height },
      });
    },
    onEnd: pnwConstrainPosition,
  });
}

function pnwStartResize(event: PointerEvent, direction: PnwFloatingPanelResizeDirection): void {
  const start = pnwCurrentBounds();
  if (pnwResizeMode.value === false || !pnwEnabledResizeDirections.value.includes(direction) || !start) return;
  const startPointer = { x: event.clientX, y: event.clientY };
  const cursor = `${direction.replace("north", "n").replace("south", "s").replace("east", "e").replace("west", "w").replaceAll("-", "")}-resize`;
  pnwBindPointerDrag(event, {
    cursor,
    onMove: (moveEvent) => {
      pnwEmitBounds(pnwResizeFloatingPanelBounds(
        start,
        {
          x: moveEvent.clientX - startPointer.x,
          y: moveEvent.clientY - startPointer.y,
        },
        direction,
        { width: window.innerWidth, height: window.innerHeight },
        pnwSizeConstraints(),
        props.constrainMargin,
        props.constrainInsets,
      ));
    },
    onEnd: pnwConstrainPosition,
  });
}

function pnwResizeKeydown(
  event: KeyboardEvent,
  direction: PnwFloatingPanelResizeDirection,
): void {
  if (pnwResizeMode.value === false || !pnwEnabledResizeDirections.value.includes(direction)) return;
  const horizontal = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  const vertical = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
  const acceptsHorizontal = direction.includes("east") || direction.includes("west");
  const acceptsVertical = direction.includes("north") || direction.includes("south");
  if ((!acceptsHorizontal || horizontal === 0) && (!acceptsVertical || vertical === 0)) return;
  const start = pnwCurrentBounds();
  if (!start) return;
  event.preventDefault();
  const step = event.shiftKey ? 16 : 4;
  pnwEmitBounds(pnwResizeFloatingPanelBounds(
    start,
    {
      x: acceptsHorizontal ? horizontal * step : 0,
      y: acceptsVertical ? vertical * step : 0,
    },
    direction,
    { width: window.innerWidth, height: window.innerHeight },
    pnwSizeConstraints(),
    props.constrainMargin,
    props.constrainInsets,
  ));
}

function pnwHandleKeydown(event: KeyboardEvent): void {
  if (
    props.open
    && pnwStackActive.value
    && props.closeOnEscape
    && event.key === "Escape"
    && !event.defaultPrevented
  ) {
    event.preventDefault();
    emit("close");
  }
}

function pnwFocus(): void {
  pnwActivate();
  pnwPanel.value?.focus({ preventScroll: true });
}

function pnwActivate(): void {
  const controller = props.stack
    ?? (pnwPanel.value ? pnwGetDocumentFloatingWindowStack(pnwPanel.value.ownerDocument) : undefined);
  controller?.activate(pnwResolvedPresentationId.value);
  emit("activate", pnwResolvedPresentationId.value);
}

function pnwResetToRecommendedSize(): void {
  if (!pnwPanel.value || typeof window === "undefined") return;
  const current = pnwCurrentBounds();
  if (!current) return;
  const next = pnwClampFloatingPanelBounds({
    position: current.position,
    size: {
      width: pnwPositiveSize(props.recommendedSize?.width, current.size.width),
      height: pnwPositiveSize(props.recommendedSize?.height, current.size.height),
    },
  }, { width: window.innerWidth, height: window.innerHeight }, pnwSizeConstraints(), props.constrainMargin, props.constrainInsets);
  pnwEmitBounds(next);
  emit("resetToRecommendedSize", next.size);
}

function pnwSyncStackRegistration(): void {
  pnwUnregisterStack?.();
  pnwUnsubscribeStack?.();
  pnwUnregisterStack = undefined;
  pnwUnsubscribeStack = undefined;
  if (!props.open || !pnwPanel.value) {
    pnwStackActive.value = false;
    pnwStackZIndex.value = undefined;
    return;
  }
  const controller = props.stack ?? pnwGetDocumentFloatingWindowStack(pnwPanel.value.ownerDocument);
  const refresh = () => {
    pnwStackActive.value = controller.isActive(pnwResolvedPresentationId.value);
    pnwStackZIndex.value = controller.resolveZIndex(pnwResolvedPresentationId.value);
  };
  pnwUnsubscribeStack = controller.subscribe(refresh);
  pnwUnregisterStack = controller.register({
    presentationId: pnwResolvedPresentationId.value,
    baseZIndex: pnwResolveWorkbenchOverlayZIndex(props.layer, props.zIndex),
    focus: () => pnwPanel.value?.focus({ preventScroll: true }),
    title: pnwResolvedTitle.value,
    ownerKind: props.ownerKind,
    requestReattach: props.requestReattach,
  });
  refresh();
}

defineExpose({
  focus: pnwFocus,
  resetToRecommendedSize: pnwResetToRecommendedSize,
});

watch(
  () => [
    props.open,
    props.position.x,
    props.position.y,
    props.size?.width,
    props.size?.height,
    props.constrainInsets.top,
    props.constrainInsets.right,
    props.constrainInsets.bottom,
    props.constrainInsets.left,
  ],
  async () => {
    pnwOptimisticBounds.value = undefined;
    await nextTick();
    pnwResizeObserver?.disconnect();
    if (props.open && pnwPanel.value) pnwResizeObserver?.observe(pnwPanel.value);
    pnwConstrainPosition();
  },
);

watch(
  () => [
    props.open,
    props.presentationId,
    props.layer,
    props.zIndex,
    props.stack,
    props.title,
    props.ownerKind,
    props.requestReattach,
  ],
  async () => {
    await nextTick();
    pnwSyncStackRegistration();
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
  void nextTick(pnwSyncStackRegistration);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", pnwConstrainPosition);
  window.removeEventListener("keydown", pnwHandleKeydown);
  pnwResizeObserver?.disconnect();
  pnwUnregisterStack?.();
  pnwUnsubscribeStack?.();
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
        tabindex="-1"
        :aria-label="ariaLabel || pnwResolvedTitle"
        :data-pnw-presentation-id="pnwResolvedPresentationId"
        :data-pnw-floating-active="pnwStackActive ? 'true' : 'false'"
        :data-pnw-remember-bounds="rememberBounds ? 'true' : 'false'"
        @pointerdown.capture="pnwActivate"
        @focusin.capture="pnwActivate"
      >
        <header
          class="pnw-floating-panel__header"
          :data-pnw-movable="movable ? 'true' : 'false'"
          @pointerdown="pnwStartDrag"
        >
          <slot name="header">
            <strong>{{ pnwResolvedTitle }}</strong>
          </slot>
          <button
            v-if="pnwResizeMode !== false && recommendedSize"
            type="button"
            class="pnw-floating-panel__reset-size"
            :aria-label="pnwT('floatingPanel.resetSize')"
            :title="pnwT('floatingPanel.resetSize')"
            @pointerdown.stop
            @click="pnwResetToRecommendedSize"
          >
            <PnwIcon name="editor-restore" :size="16" />
          </button>
          <slot name="actions" />
          <button
            v-if="showCloseAction"
            type="button"
            class="pnw-floating-panel__close"
            :aria-label="pnwResolvedCloseLabel"
            :title="pnwResolvedCloseLabel"
            @pointerdown.stop
            @click="emit('close')"
          >
            <PnwIcon :name="closeIcon" :size="16" />
          </button>
        </header>
        <div class="pnw-floating-panel__content">
          <slot />
        </div>
        <template v-if="pnwResizeMode !== false">
          <span
            v-for="direction in pnwEnabledResizeDirections"
            :key="direction"
            class="pnw-floating-panel__resize-handle"
            :class="`pnw-floating-panel__resize-handle--${direction}`"
            :data-pnw-resize-direction="direction"
            role="separator"
            tabindex="0"
            :aria-label="pnwT(pnwResizeLabels[direction])"
            @pointerdown.stop="pnwStartResize($event, direction)"
            @keydown="pnwResizeKeydown($event, direction)"
          />
        </template>
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

.pnw-floating-panel[data-pnw-floating-active="true"] {
  border-color: var(--pnw-floating-panel-active-border, var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6)));
  box-shadow: var(--pnw-floating-panel-active-shadow, 0 20px 52px rgba(15, 23, 42, 0.3));
}

.pnw-floating-panel__header {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px 0 14px;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  cursor: default;
  touch-action: none;
  user-select: none;
}

.pnw-floating-panel__header[data-pnw-movable="true"] {
  cursor: move;
}

.pnw-floating-panel__header > :first-child {
  flex: 1;
  min-width: 0;
}

.pnw-floating-panel__close,
.pnw-floating-panel__reset-size {
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
.pnw-floating-panel__close:focus-visible,
.pnw-floating-panel__reset-size:hover,
.pnw-floating-panel__reset-size:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, rgba(148, 163, 184, 0.16));
}

.pnw-floating-panel__content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.pnw-floating-panel__resize-handle {
  position: absolute;
  z-index: 2;
  display: block;
  border: 0;
  outline: none;
  background: transparent;
  touch-action: none;
}

.pnw-floating-panel__resize-handle:focus-visible {
  border-radius: 3px;
  box-shadow: inset 0 0 0 2px var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-floating-panel__resize-handle--north,
.pnw-floating-panel__resize-handle--south {
  left: 14px;
  right: 14px;
  height: 8px;
  cursor: ns-resize;
}

.pnw-floating-panel__resize-handle--north { top: -4px; }
.pnw-floating-panel__resize-handle--south { bottom: -4px; }

.pnw-floating-panel__resize-handle--east,
.pnw-floating-panel__resize-handle--west {
  top: 14px;
  bottom: 14px;
  width: 8px;
  cursor: ew-resize;
}

.pnw-floating-panel__resize-handle--east { right: -4px; }
.pnw-floating-panel__resize-handle--west { left: -4px; }

.pnw-floating-panel__resize-handle--north-east,
.pnw-floating-panel__resize-handle--south-east,
.pnw-floating-panel__resize-handle--south-west,
.pnw-floating-panel__resize-handle--north-west {
  width: 14px;
  height: 14px;
}

.pnw-floating-panel__resize-handle--north-east {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.pnw-floating-panel__resize-handle--south-east {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}

.pnw-floating-panel__resize-handle--south-west {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.pnw-floating-panel__resize-handle--north-west {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}
</style>
