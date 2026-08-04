<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwLocale } from "../types/PnwLocale.js";
import type { PnwWorkbenchLayoutSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwBottomPanelTab,
  PnwViewBlockContributions,
  PnwViewBlockId,
  PnwViewBlockVisibility,
  PnwWorkbenchLayoutState,
  PnwWorkbenchLayoutViewport,
  PnwWorkbenchTabBarPlacement,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  PNW_WORKBENCH_PANEL_SIZE_LIMITS,
  pnwResizeWorkbenchLayoutState,
  pnwResolveWorkbenchResponsiveState,
  pnwResolveWorkbenchLayoutState,
  pnwResolveViewBlockVisibility,
  pnwShouldRestoreEditorFromKeyboard,
  pnwToggleViewBlockVisibility,
} from "../utils/pnwWorkbenchWeb.js";
import { pnwBindPointerDrag } from "../utils/pnwPointerDrag.js";
import { pnwProvideLocale, usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "../components/PnwIcon.vue";
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
  tabBarPlacement?: PnwWorkbenchTabBarPlacement;
  showFooter?: boolean;
  /** 仅改变当前壳层呈现，不属于可持久化 display/layout preferences。 */
  editorMaximized?: boolean;
  /** Host 受控语言；Wing 不持久化。 */
  locale?: PnwLocale;
}>(), {
  activityBarPresentation: "ribbon",
  contributions: () => ({}),
  visibility: () => ({ primary: false, bottom: false, secondary: false }),
  bottomTabs: () => [],
  activeBottomTabId: "",
  colorScheme: "system",
  tabBarPlacement: PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  showFooter: true,
  editorMaximized: false,
  locale: "zh-CN",
});

const emit = defineEmits<{
  "update:visibility": [visibility: PnwViewBlockVisibility];
  "update:layoutState": [layoutState: PnwWorkbenchLayoutState];
  "update:activeBottomTabId": [tabId: string];
  selectBottomTab: [tabId: string];
  toggle: [blockId: PnwViewBlockId];
  "update:editorMaximized": [maximized: boolean];
}>();

defineSlots<{
  default(): unknown;
  header(props: PnwWorkbenchLayoutSlotProps): unknown;
  activity(props: PnwWorkbenchLayoutSlotProps): unknown;
  "view-tabs"(): unknown;
  primary(): unknown;
  bottom(props: { readonly activeTabId: string }): unknown;
  "bottom-summary"(): unknown;
  secondary(): unknown;
  footer(): unknown;
}>();

const pnwSlots = useSlots();
const pnwLayoutElement = ref<HTMLElement>();
const pnwMainElement = ref<HTMLElement>();
const pnwContainerWidth = ref<number>();
let pnwResponsiveObserver: ResizeObserver | undefined;
pnwProvideLocale(() => props.locale);
const { t: pnwT } = usePnwLocale(() => props.locale);

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
const pnwPrimaryToggleLabel = computed(() => pnwT(
  pnwVisibility.value.primary
    ? "workbench.layout.primaryCollapse"
    : "workbench.layout.primaryExpand",
));
const pnwResolvedBottomTabId = computed(() => props.bottomTabs.some(
  (tab) => tab.id === props.activeBottomTabId && !tab.disabled,
) ? props.activeBottomTabId : props.bottomTabs.find((tab) => !tab.disabled)?.id ?? "");
const pnwResponsiveState = computed(() => pnwResolveWorkbenchResponsiveState(
  props.activityBarPresentation,
  props.tabBarPlacement,
  pnwContainerWidth.value,
));
const pnwLayoutSlotState = computed(() => ({
  ...pnwResponsiveState.value,
  editorMaximized: props.editorMaximized,
  requestEditorMaximized: (maximized: boolean) => emit("update:editorMaximized", maximized),
}));

function pnwMeasureContainer(): void {
  const width = pnwLayoutElement.value?.clientWidth;
  pnwContainerWidth.value = width && width > 0 ? width : undefined;
}

onMounted(() => {
  pnwMeasureContainer();
  if (typeof ResizeObserver !== "undefined") {
    pnwResponsiveObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      pnwContainerWidth.value = width && width > 0 ? width : undefined;
    });
    if (pnwLayoutElement.value) pnwResponsiveObserver.observe(pnwLayoutElement.value);
  } else if (typeof window !== "undefined") {
    window.addEventListener("resize", pnwMeasureContainer);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", pnwHandleEditorMaximizedKeydown);
  }
});

onBeforeUnmount(() => {
  pnwResponsiveObserver?.disconnect();
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", pnwMeasureContainer);
    window.removeEventListener("keydown", pnwHandleEditorMaximizedKeydown);
  }
});

function pnwHandleEditorMaximizedKeydown(event: KeyboardEvent): void {
  if (!props.editorMaximized || !pnwShouldRestoreEditorFromKeyboard(
    event.key,
    event.defaultPrevented,
  )) return;
  event.preventDefault();
  emit("update:editorMaximized", false);
}

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
    width: main.clientWidth,
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
    ref="pnwLayoutElement"
    class="pnw-workbench-layout pnw-workbench-theme-root"
    :data-pnw-color-scheme="colorScheme"
    :data-pnw-narrow="pnwResponsiveState.narrow"
    :data-pnw-preferred-activity-presentation="activityBarPresentation"
    :data-pnw-activity-presentation="pnwResponsiveState.effectivePresentation"
    :data-pnw-preferred-tab-bar-placement="tabBarPlacement"
    :data-pnw-tab-bar-placement="pnwResponsiveState.effectiveTabBarPlacement"
    :data-pnw-editor-maximized="editorMaximized"
  >
    <div
      v-if="$slots.header && (!editorMaximized
        || pnwResponsiveState.effectiveTabBarPlacement === 'header')"
      class="pnw-workbench-header-slot"
    >
      <slot name="header" v-bind="pnwLayoutSlotState" />
    </div>

    <div
      class="pnw-workbench-body"
      :class="`pnw-workbench-body--${pnwResponsiveState.effectivePresentation}`"
    >
      <div
        v-if="$slots.activity && !editorMaximized"
        class="pnw-workbench-activity"
        :class="pnwResponsiveState.effectivePresentation === 'ribbon'
          ? 'pnw-workbench-activity-top'
          : 'pnw-workbench-activity-side'"
      >
        <slot name="activity" v-bind="pnwLayoutSlotState" />
      </div>

      <div class="pnw-workbench-content">
        <div ref="pnwMainElement" class="pnw-workbench-main">
          <Transition name="pnw-workbench-block">
            <div
              v-if="!editorMaximized
                && pnwAvailableContributions.primary && pnwVisibility.primary"
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
                :aria-label="pnwT('workbench.layout.primaryResize')"
                :aria-valuenow="pnwLayoutState.sizes.primaryWidth"
                :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.primaryMin"
                :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.primaryMax"
                tabindex="0"
                :title="pnwT('workbench.layout.primaryResizeHint')"
                @pointerdown="pnwStartBlockResize('primary', $event)"
                @keydown="pnwResizeBlockByKeyboard('primary', $event)"
              />
            </div>
          </Transition>

          <div class="pnw-workbench-editor-stack">
            <div
              v-if="pnwResponsiveState.effectiveTabBarPlacement === 'after-navigation'
                && $slots['view-tabs']"
              class="pnw-workbench-view-tabs pnw-workbench-view-tabs--editor-top"
            >
              <slot name="view-tabs" />
            </div>
            <main
              class="pnw-workbench-editor"
              :data-pnw-primary-available="!editorMaximized && pnwAvailableContributions.primary
                ? 'true'
                : undefined"
            >
              <button
                v-if="!editorMaximized
                  && pnwAvailableContributions.primary"
                type="button"
                class="pnw-workbench-primary-toggle pnw-workbench-primary-toggle--editor-header"
                data-pnw-workbench-primary-toggle
                data-pnw-primary-toggle-placement="editor-header"
                :data-pnw-primary-expanded="pnwVisibility.primary"
                :title="pnwPrimaryToggleLabel"
                :aria-label="pnwPrimaryToggleLabel"
                :aria-expanded="pnwVisibility.primary"
                @click="pnwToggleBlock('primary')"
              >
                <PnwIcon :name="pnwVisibility.primary ? 'chevron-left' : 'chevron-right'" :size="16" />
              </button>
              <slot />
            </main>
            <Transition name="pnw-workbench-block">
              <div
                v-if="!editorMaximized
                  && pnwAvailableContributions.bottom && pnwVisibility.bottom"
                class="pnw-workbench-bottom-region"
                :style="{ height: `${pnwLayoutState.sizes.bottomHeight}px` }"
              >
                <div
                  class="pnw-workbench-resize-handle pnw-workbench-resize-handle--bottom"
                  role="separator"
                  aria-orientation="horizontal"
                  :aria-label="pnwT('workbench.layout.bottomResize')"
                  :aria-valuenow="pnwLayoutState.sizes.bottomHeight"
                  :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.bottomMin"
                  :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.bottomMax"
                  tabindex="0"
                  :title="pnwT('workbench.layout.bottomResizeHint')"
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
            <div
              v-if="pnwResponsiveState.effectiveTabBarPlacement === 'editor-bottom'
                && $slots['view-tabs']"
              class="pnw-workbench-view-tabs pnw-workbench-view-tabs--editor-bottom"
            >
              <slot name="view-tabs" />
            </div>
          </div>

          <Transition name="pnw-workbench-block">
            <div
              v-if="!editorMaximized
                && pnwAvailableContributions.secondary && pnwVisibility.secondary"
              class="pnw-workbench-secondary-region"
              :style="{ width: `${pnwLayoutState.sizes.secondaryWidth}px` }"
            >
              <div
                class="pnw-workbench-resize-handle pnw-workbench-resize-handle--secondary"
                role="separator"
                aria-orientation="vertical"
                :aria-label="pnwT('workbench.layout.secondaryResize')"
                :aria-valuenow="pnwLayoutState.sizes.secondaryWidth"
                :aria-valuemin="PNW_WORKBENCH_PANEL_SIZE_LIMITS.secondaryMin"
                :aria-valuemax="PNW_WORKBENCH_PANEL_SIZE_LIMITS.secondaryMax"
                tabindex="0"
                :title="pnwT('workbench.layout.secondaryResizeHint')"
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
          v-if="showFooter && !editorMaximized"
          class="pnw-workbench-footer-region"
          :contributions="pnwAvailableContributions"
          :visibility="pnwVisibility"
          @toggle="pnwToggleBlock"
        >
          <slot name="footer" />
        </PnwWorkbenchFooter>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pnw-workbench-layout {
  --pnw-workbench-overlay-content: 0;
  --pnw-workbench-overlay-chrome: 100;
  --pnw-workbench-overlay-floating-panel: 1200;
  --pnw-workbench-overlay-host-tools: 1400;
  --pnw-workbench-overlay-modal: 2000;
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

.pnw-workbench-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: grid;
  overflow: hidden;
}

.pnw-workbench-body--ribbon {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: max-content minmax(0, 1fr) max-content;
}

.pnw-workbench-body--tree {
  grid-template-columns: max-content minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) max-content;
}

.pnw-workbench-content {
  display: contents;
}

.pnw-workbench-activity {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.pnw-workbench-activity-top {
  position: relative;
  z-index: 3;
  grid-column: 1;
  grid-row: 1;
}

.pnw-workbench-activity-side {
  grid-column: 1;
  grid-row: 1;
}

.pnw-workbench-header-slot {
  position: relative;
  z-index: var(--pnw-workbench-overlay-host-tools, 1400);
  flex: 0 0 auto;
  min-width: 0;
}

.pnw-workbench-layout[data-pnw-editor-maximized="true"] .pnw-workbench-body {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.pnw-workbench-layout[data-pnw-editor-maximized="true"] .pnw-workbench-content {
  display: contents;
}

.pnw-workbench-layout[data-pnw-editor-maximized="true"] .pnw-workbench-main {
  grid-column: 1;
  grid-row: 1;
  grid-template-columns: minmax(0, 1fr);
}

.pnw-workbench-layout[data-pnw-editor-maximized="true"] .pnw-workbench-editor-stack {
  grid-column: 1;
}

.pnw-workbench-view-tabs {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  min-width: 0;
  overflow: hidden;
}

.pnw-workbench-view-tabs--editor-bottom {
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-workbench-view-tabs--editor-bottom :deep(.pnw-tab-bar) {
  padding-top: 0;
  border-bottom: 0;
}

.pnw-workbench-main {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: stretch;
  overflow: hidden;
}

.pnw-workbench-body--ribbon .pnw-workbench-main {
  grid-column: 1;
  grid-row: 2;
}

.pnw-workbench-body--tree .pnw-workbench-main {
  grid-column: 2;
  grid-row: 1;
}

.pnw-workbench-body--ribbon .pnw-workbench-footer-region {
  grid-column: 1;
  grid-row: 3;
}

.pnw-workbench-body--tree .pnw-workbench-footer-region {
  grid-column: 1 / -1;
  grid-row: 2;
}

.pnw-workbench-primary-region {
  grid-column: 1;
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
  grid-column: 2;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pnw-editor-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
}

.pnw-workbench-secondary-region {
  grid-column: 3;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.pnw-workbench-editor {
  --pnw-workbench-view-header-leading-space: 0px;
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.pnw-workbench-editor[data-pnw-primary-available="true"] {
  --pnw-workbench-view-header-leading-space: 32px;
}

/*
 * Compatibility rail for Views that have not migrated to PnwPageHeader yet.
 * The framework owns the Primary toggle, so a legacy View must not have to
 * add product-specific padding merely to avoid the Workbench chrome.
 */
.pnw-workbench-editor[data-pnw-primary-available="true"]:not(:has(.pnw-page-head)) {
  box-sizing: border-box;
  padding-inline-start: var(--pnw-workbench-view-header-legacy-leading-space, 40px);
}

.pnw-workbench-primary-toggle {
  position: absolute;
  z-index: 6;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-control-radius, 6px);
  background: var(
    --pnw-workbench-view-header-control-bg,
    color-mix(
      in srgb,
      var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)) 10%,
      transparent
    )
  );
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

.pnw-workbench-primary-toggle--editor-header {
  top: calc((var(--pnw-workbench-view-header-height, 40px) - 26px) / 2);
  left: 10px;
}

.pnw-workbench-primary-toggle:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
}

.pnw-workbench-primary-toggle:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: 1px;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
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

@container pnw-workbench (max-width: 840px) {
  .pnw-workbench-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: max-content minmax(0, 1fr);
  }

  .pnw-workbench-content {
    grid-column: 1;
    grid-row: 2;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .pnw-workbench-main {
    min-height: 100%;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .pnw-workbench-editor-stack {
    display: contents;
  }

  .pnw-workbench-primary-region,
  .pnw-workbench-secondary-region {
    width: 100% !important;
    flex: 0 0 auto;
  }

  .pnw-workbench-view-tabs--editor-top {
    width: 100%;
    order: -4;
  }

  .pnw-workbench-primary-region {
    order: -3;
  }

  .pnw-workbench-editor {
    order: -2;
  }

  .pnw-workbench-secondary-region {
    order: -1;
  }

  .pnw-workbench-bottom-region {
    order: 0;
  }

  .pnw-workbench-view-tabs--editor-bottom {
    order: 1;
  }

  .pnw-workbench-editor,
  .pnw-workbench-bottom-region,
  .pnw-workbench-secondary-region,
  .pnw-workbench-view-tabs--editor-bottom {
    width: 100%;
  }

  .pnw-workbench-primary-slot,
  .pnw-workbench-secondary-slot {
    width: 100%;
    height: auto;
    min-width: 0;
    max-width: none;
    overflow: visible;
    border-right: 0;
    border-left: 0;
  }

  .pnw-workbench-primary-slot {
    border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  }

  .pnw-workbench-secondary-slot {
    border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  }

  .pnw-workbench-editor {
    min-height: var(--pnw-workbench-narrow-editor-min-height, 360px);
    flex: 0 0 auto;
    overflow: visible;
  }

  .pnw-workbench-resize-handle {
    display: none;
  }

  .pnw-workbench-footer-region {
    flex: 0 0 auto;
  }
}
</style>
