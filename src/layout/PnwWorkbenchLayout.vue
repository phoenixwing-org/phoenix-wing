<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwActivityBarPresentation,
  PnwBottomPanelTab,
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
  PnwWorkbenchLayoutState,
  PnwWorkbenchLayoutViewport,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
  PNW_WORKBENCH_PANEL_SIZE_LIMITS,
  pnwAvailableViewBlockIds,
  pnwResizeWorkbenchLayoutState,
  pnwResolveWorkbenchLayoutState,
  pnwResolveViewBlockVisibility,
  pnwToggleViewBlockVisibility,
} from "../utils/pnwWorkbenchWeb.js";
import { pnwBindPointerDrag } from "../utils/pnwPointerDrag.js";
import PnwBottomPanel from "./PnwBottomPanel.vue";
import PnwPrimaryBlock from "./PnwPrimaryBlock.vue";
import PnwSecondaryBlock from "./PnwSecondaryBlock.vue";
import PnwWorkbenchFooter from "./PnwWorkbenchFooter.vue";

const props = withDefaults(defineProps<{
  activityBarPresentation?: PnwActivityBarPresentation;
  contributions?: PnwViewBlockContributions;
  visibility?: PnwViewBlockVisibility;
  layoutState?: PnwWorkbenchLayoutState;
  bottomTabs?: readonly PnwBottomPanelTab[];
  activeBottomTabId?: string;
  colorScheme?: PnwColorScheme;
}>(), {
  activityBarPresentation: "ribbon",
  contributions: () => ({}),
  visibility: () => ({ primary: false, bottom: false, secondary: false }),
  bottomTabs: () => [],
  activeBottomTabId: "",
  colorScheme: "system",
});

const emit = defineEmits<{
  "update:visibility": [visibility: PnwViewBlockVisibility];
  "update:layoutState": [layoutState: PnwWorkbenchLayoutState];
  "update:activeBottomTabId": [tabId: string];
  selectBottomTab: [tabId: string];
  toggle: [blockId: PnwViewBlockId];
}>();

const pnwSlots = useSlots();
const pnwMainElement = ref<HTMLElement>();
const pnwActivitySideElement = ref<HTMLElement>();

/** contribution 与实际 slot 必须同时存在，避免生成空面板。 */
const pnwAvailableContributions = computed<PnwViewBlockContributions>(() => ({
  primary: Boolean(props.contributions.primary && pnwSlots.primary),
  bottom: Boolean(props.contributions.bottom && pnwSlots.bottom),
  secondary: Boolean(props.contributions.secondary && pnwSlots.secondary),
}));

const pnwLayoutState = computed(() => pnwResolveWorkbenchLayoutState(
  props.layoutState ?? {
    visibility: props.visibility,
    sizes: PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
  },
));
const pnwVisibility = computed(() => pnwResolveViewBlockVisibility(
  pnwAvailableContributions.value,
  pnwLayoutState.value.visibility,
));
const pnwAvailableBlockIds = computed(() => pnwAvailableViewBlockIds(
  pnwAvailableContributions.value,
));
const pnwResolvedBottomTabId = computed(() => props.bottomTabs.some(
  (tab) => tab.id === props.activeBottomTabId && !tab.disabled,
) ? props.activeBottomTabId : props.bottomTabs.find((tab) => !tab.disabled)?.id ?? "");

function pnwToggleBlock(blockId: PnwViewBlockId): void {
  const visibility = pnwToggleViewBlockVisibility(
    pnwAvailableContributions.value,
    pnwLayoutState.value.visibility,
    blockId,
  );
  emit("update:visibility", visibility);
  emit("update:layoutState", { ...pnwLayoutState.value, visibility });
  emit("toggle", blockId);
}

function pnwLayoutViewport(): PnwWorkbenchLayoutViewport | undefined {
  const main = pnwMainElement.value;
  if (!main) return undefined;
  return {
    width: Math.max(0, main.clientWidth - (pnwActivitySideElement.value?.clientWidth ?? 0)),
    height: main.clientHeight,
  };
}

function pnwResizeBlock(blockId: PnwViewBlockId, requestedSize: number): void {
  emit("update:layoutState", pnwResizeWorkbenchLayoutState(
    pnwLayoutState.value,
    blockId,
    requestedSize,
    pnwLayoutViewport(),
  ));
}

function pnwStartBlockResize(blockId: PnwViewBlockId, event: PointerEvent): void {
  const startPosition = blockId === "bottom" ? event.clientY : event.clientX;
  const startSize = blockId === "primary"
    ? pnwLayoutState.value.sizes.primaryWidth
    : blockId === "secondary"
      ? pnwLayoutState.value.sizes.secondaryWidth
      : pnwLayoutState.value.sizes.bottomHeight;
  pnwBindPointerDrag(event, {
    cursor: blockId === "bottom" ? "row-resize" : "col-resize",
    onMove(nextEvent) {
      const pointerPosition = blockId === "bottom" ? nextEvent.clientY : nextEvent.clientX;
      const direction = blockId === "primary" ? 1 : -1;
      pnwResizeBlock(blockId, startSize + ((pointerPosition - startPosition) * direction));
    },
    onEnd() {},
  });
}

function pnwResizeBlockByKeyboard(blockId: PnwViewBlockId, event: KeyboardEvent): void {
  const current = blockId === "primary"
    ? pnwLayoutState.value.sizes.primaryWidth
    : blockId === "secondary"
      ? pnwLayoutState.value.sizes.secondaryWidth
      : pnwLayoutState.value.sizes.bottomHeight;
  const step = event.shiftKey ? 40 : 12;
  let requested: number | undefined;
  if (blockId === "bottom") {
    if (event.key === "ArrowUp") requested = current + step;
    else if (event.key === "ArrowDown") requested = current - step;
  } else if (blockId === "primary") {
    if (event.key === "ArrowRight") requested = current + step;
    else if (event.key === "ArrowLeft") requested = current - step;
  } else {
    if (event.key === "ArrowLeft") requested = current + step;
    else if (event.key === "ArrowRight") requested = current - step;
  }
  if (event.key === "Home") requested = 0;
  if (event.key === "End") requested = Number.MAX_SAFE_INTEGER;
  if (requested === undefined) return;
  event.preventDefault();
  pnwResizeBlock(blockId, requested);
}

function pnwSelectBottomTab(tabId: string): void {
  emit("update:activeBottomTabId", tabId);
  emit("selectBottomTab", tabId);
}
</script>

<template>
  <section
    class="pnw-workbench-layout"
    :data-pnw-color-scheme="colorScheme"
    :data-pnw-activity-presentation="activityBarPresentation"
  >
    <div v-if="$slots.header" class="pnw-workbench-header-slot">
      <slot name="header" />
    </div>

    <div
      v-if="activityBarPresentation === 'ribbon' && $slots.activity"
      class="pnw-workbench-activity-top"
    >
      <slot name="activity" />
    </div>

    <div ref="pnwMainElement" class="pnw-workbench-main">
      <div
        v-if="activityBarPresentation === 'tree' && $slots.activity"
        ref="pnwActivitySideElement"
        class="pnw-workbench-activity-side"
      >
        <slot name="activity" />
      </div>

      <Transition name="pnw-workbench-block">
        <div
          v-if="pnwAvailableContributions.primary && pnwVisibility.primary"
          class="pnw-workbench-primary-region"
          :style="{ width: `${pnwLayoutState.sizes.primaryWidth}px` }"
        >
          <PnwPrimaryBlock class="pnw-workbench-primary-slot" :resizable="false">
            <slot name="primary" />
          </PnwPrimaryBlock>
          <div
            class="pnw-workbench-resize-handle pnw-workbench-resize-handle--primary"
            role="separator"
            aria-orientation="vertical"
            aria-label="调节 Primary Block 宽度"
            :aria-valuenow="pnwLayoutState.sizes.primaryWidth"
            :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.primaryMin"
            :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.primaryMax"
            tabindex="0"
            title="拖动调节 Primary Block 宽度"
            @pointerdown="pnwStartBlockResize('primary', $event)"
            @keydown="pnwResizeBlockByKeyboard('primary', $event)"
          />
        </div>
      </Transition>

      <div class="pnw-workbench-editor-stack">
        <main class="pnw-workbench-editor">
          <slot />
        </main>
        <Transition name="pnw-workbench-block">
          <div
            v-if="pnwAvailableContributions.bottom && pnwVisibility.bottom"
            class="pnw-workbench-bottom-region"
            :style="{ height: `${pnwLayoutState.sizes.bottomHeight}px` }"
          >
            <div
              class="pnw-workbench-resize-handle pnw-workbench-resize-handle--bottom"
              role="separator"
              aria-orientation="horizontal"
              aria-label="调节 Bottom Panel 高度"
              :aria-valuenow="pnwLayoutState.sizes.bottomHeight"
              :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.bottomMin"
              :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.bottomMax"
              tabindex="0"
              title="拖动调节 Bottom Panel 高度"
              @pointerdown="pnwStartBlockResize('bottom', $event)"
              @keydown="pnwResizeBlockByKeyboard('bottom', $event)"
            />
            <PnwBottomPanel
              class="pnw-workbench-bottom-slot"
              :resizable="false"
              :tabs="bottomTabs"
              :active-tab-id="activeBottomTabId"
              @update:active-tab-id="pnwSelectBottomTab"
            >
              <template v-if="pnwSlots['bottom-summary']" #summary>
                <slot name="bottom-summary" />
              </template>
              <slot name="bottom" :active-tab-id="pnwResolvedBottomTabId" />
            </PnwBottomPanel>
          </div>
        </Transition>
      </div>

      <Transition name="pnw-workbench-block">
        <div
          v-if="pnwAvailableContributions.secondary && pnwVisibility.secondary"
          class="pnw-workbench-secondary-region"
          :style="{ width: `${pnwLayoutState.sizes.secondaryWidth}px` }"
        >
          <div
            class="pnw-workbench-resize-handle pnw-workbench-resize-handle--secondary"
            role="separator"
            aria-orientation="vertical"
            aria-label="调节 Secondary Block 宽度"
            :aria-valuenow="pnwLayoutState.sizes.secondaryWidth"
            :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.secondaryMin"
            :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.secondaryMax"
            tabindex="0"
            title="拖动调节 Secondary Block 宽度"
            @pointerdown="pnwStartBlockResize('secondary', $event)"
            @keydown="pnwResizeBlockByKeyboard('secondary', $event)"
          />
          <PnwSecondaryBlock class="pnw-workbench-secondary-slot" :resizable="false">
            <slot name="secondary" />
          </PnwSecondaryBlock>
        </div>
      </Transition>
    </div>

    <PnwWorkbenchFooter
      v-if="pnwAvailableBlockIds.length > 0 || pnwSlots.footer"
      :contributions="pnwAvailableContributions"
      :visibility="pnwVisibility"
      @toggle="pnwToggleBlock"
    >
      <slot name="footer" />
    </PnwWorkbenchFooter>
  </section>
</template>

<style scoped>
.pnw-workbench-layout {
  container: pnw-workbench / inline-size;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f8fafc));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  font-family: var(--pnw-workbench-font-family, Inter, ui-sans-serif, system-ui, sans-serif);
}

.pnw-workbench-layout[data-pnw-color-scheme="light"],
.pnw-workbench-layout[data-pnw-color-scheme="system"] {
  color-scheme: light;
  --pnw-workbench-default-bg: #f8fafc;
  --pnw-workbench-default-surface: #ffffff;
  --pnw-workbench-default-text: #0f172a;
  --pnw-workbench-default-muted: #64748b;
  --pnw-workbench-default-border: #dbe3ed;
  --pnw-workbench-default-tree-bg: #f8fafc;
  --pnw-workbench-default-ribbon-bg: #ffffff;
  --pnw-workbench-default-module-bg: #f1f5f9;
  --pnw-workbench-default-footer-bg: #eef2f7;
  --pnw-workbench-default-hover-bg: rgba(59, 130, 246, 0.09);
  --pnw-workbench-default-active-bg: rgba(37, 99, 235, 0.13);
  --pnw-workbench-default-active-text: #1d4ed8;
  --pnw-workbench-default-focus: #3b82f6;
  --pnw-workbench-default-overlay-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
}

.pnw-workbench-layout[data-pnw-color-scheme="dark"] {
  color-scheme: dark;
  --pnw-workbench-default-bg: #0b1220;
  --pnw-workbench-default-surface: #111827;
  --pnw-workbench-default-text: #e5edf7;
  --pnw-workbench-default-muted: #94a3b8;
  --pnw-workbench-default-border: #2a3a50;
  --pnw-workbench-default-tree-bg: #0f172a;
  --pnw-workbench-default-ribbon-bg: #111827;
  --pnw-workbench-default-module-bg: #172033;
  --pnw-workbench-default-footer-bg: #0f172a;
  --pnw-workbench-default-hover-bg: rgba(96, 165, 250, 0.14);
  --pnw-workbench-default-active-bg: rgba(59, 130, 246, 0.24);
  --pnw-workbench-default-active-text: #bfdbfe;
  --pnw-workbench-default-focus: #60a5fa;
  --pnw-workbench-default-overlay-shadow: 0 14px 32px rgba(0, 0, 0, 0.48);
}

.pnw-workbench-activity-top {
  position: relative;
  z-index: 3;
  flex: 0 0 auto;
  min-width: 0;
}

.pnw-workbench-header-slot {
  position: relative;
  z-index: 4;
  flex: 0 0 auto;
  min-width: 0;
}

.pnw-workbench-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: max-content max-content minmax(0, 1fr) max-content;
  align-items: stretch;
  overflow: hidden;
}

.pnw-workbench-activity-side {
  grid-column: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.pnw-workbench-primary-region {
  grid-column: 2;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.pnw-workbench-primary-slot,
.pnw-workbench-secondary-slot {
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: none;
}

.pnw-workbench-editor-stack {
  grid-column: 3;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pnw-editor-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
}

.pnw-workbench-secondary-region {
  grid-column: 4;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.pnw-workbench-editor {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.pnw-workbench-bottom-region {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  min-height: 0;
}

.pnw-workbench-bottom-slot {
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: none;
}

.pnw-workbench-resize-handle {
  position: absolute;
  z-index: 5;
  border: 0;
  background: transparent;
  touch-action: none;
}

.pnw-workbench-resize-handle::after {
  position: absolute;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)) 44%, transparent);
  content: "";
}

.pnw-workbench-resize-handle:hover,
.pnw-workbench-resize-handle:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8)) 10%, transparent);
}

.pnw-workbench-resize-handle:hover::after,
.pnw-workbench-resize-handle:focus-visible::after {
  background: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
}

.pnw-workbench-resize-handle--primary,
.pnw-workbench-resize-handle--secondary {
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
}

.pnw-workbench-resize-handle--primary {
  right: -4px;
}

.pnw-workbench-resize-handle--secondary {
  left: -4px;
}

.pnw-workbench-resize-handle--primary::after,
.pnw-workbench-resize-handle--secondary::after {
  top: 50%;
  left: 2px;
  width: 3px;
  height: 28px;
  transform: translateY(-50%);
}

.pnw-workbench-resize-handle--bottom {
  top: -4px;
  right: 0;
  left: 0;
  height: 7px;
  cursor: row-resize;
}

.pnw-workbench-resize-handle--bottom::after {
  top: 2px;
  left: 50%;
  width: 28px;
  height: 3px;
  transform: translateX(-50%);
}

.pnw-workbench-block-enter-active,
.pnw-workbench-block-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.pnw-workbench-block-enter-from,
.pnw-workbench-block-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-color-scheme: dark) {
  .pnw-workbench-layout[data-pnw-color-scheme="system"] {
    color-scheme: dark;
    --pnw-workbench-default-bg: #0b1220;
    --pnw-workbench-default-surface: #111827;
    --pnw-workbench-default-text: #e5edf7;
    --pnw-workbench-default-muted: #94a3b8;
    --pnw-workbench-default-border: #2a3a50;
    --pnw-workbench-default-tree-bg: #0f172a;
    --pnw-workbench-default-ribbon-bg: #111827;
    --pnw-workbench-default-module-bg: #172033;
    --pnw-workbench-default-footer-bg: #0f172a;
    --pnw-workbench-default-hover-bg: rgba(96, 165, 250, 0.14);
    --pnw-workbench-default-active-bg: rgba(59, 130, 246, 0.24);
    --pnw-workbench-default-active-text: #bfdbfe;
    --pnw-workbench-default-focus: #60a5fa;
    --pnw-workbench-default-overlay-shadow: 0 14px 32px rgba(0, 0, 0, 0.48);
  }
}

@container pnw-workbench (max-width: 840px) {
  .pnw-workbench-main {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .pnw-workbench-activity-side {
    grid-column: 1;
    grid-row: 1;
    max-height: 220px;
    border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  }

  .pnw-workbench-editor-stack {
    grid-column: 1;
    grid-row: 2;
  }

  .pnw-workbench-activity-side :deep(.pnw-activity-tree:not(.pnw-activity-tree--collapsed)) {
    width: 100%;
    max-width: none;
    border-right: 0;
  }

  .pnw-workbench-primary-region,
  .pnw-workbench-secondary-region {
    display: none;
  }
}
</style>
