<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwActivityTreeCollapsedMode,
  PnwNavigationNode,
} from "../types/PnwWorkbenchWeb.js";
import { pnwClampFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";
import {
  pnwFlattenNavigationTree,
  pnwNavigationLeaves,
  pnwNavigationNodeContains,
  pnwVisibleNavigationNodes,
} from "../utils/pnwNavigationTree.js";
import PnwIcon from "../components/PnwIcon.vue";
import PnwIconRenderer from "../components/PnwIconRenderer.vue";
import {
  PNW_ACTIVITY_TREE_FLYOUT_CLOSE_DELAY_MS,
  pnwCanHoverActivityTreeFlyout,
  pnwResolveActivityTreeFlyoutOpenDelay,
} from "./PnwActivityTreeFlyoutTiming.js";

const props = withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  activeNodeId?: string;
  expandedNodeIds?: readonly string[];
  mode?: PnwActivityTreeCollapsedMode;
  ariaLabel?: string;
  colorScheme?: PnwColorScheme;
}>(), {
  activeNodeId: "",
  expandedNodeIds: () => [],
  mode: "leaf-rail",
  ariaLabel: "全局导航快捷栏",
  colorScheme: "system",
});

const emit = defineEmits<{
  activate: [nodeId: string];
  "update:expandedNodeIds": [nodeIds: readonly string[]];
}>();

const pnwLeafNodes = computed(() => pnwNavigationLeaves(props.nodes));
const pnwRootNodes = computed(() => pnwVisibleNavigationNodes(props.nodes));
const pnwRailNodes = computed(() => props.mode === "leaf-rail"
  ? pnwLeafNodes.value
  : pnwRootNodes.value);
const pnwOpenRootId = ref("");
const pnwFlyout = ref<HTMLElement>();
const pnwFlyoutPosition = ref({ x: 56, y: 48 });
const pnwRootButtons = new Map<string, HTMLButtonElement>();
const pnwFlyoutButtons = new Map<string, HTMLButtonElement>();
let pnwFlyoutOpenTimer: ReturnType<typeof setTimeout> | undefined;
let pnwFlyoutCloseTimer: ReturnType<typeof setTimeout> | undefined;
const pnwOpenRoot = computed(() => pnwRootNodes.value.find(
  (node) => node.id === pnwOpenRootId.value,
));
const pnwFlyoutRows = computed(() => pnwOpenRoot.value
  ? pnwFlattenNavigationTree(pnwOpenRoot.value.children ?? [], props.expandedNodeIds)
  : []);

function pnwSetButton(
  target: Map<string, HTMLButtonElement>,
  nodeId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) target.set(nodeId, element);
  else target.delete(nodeId);
}

function pnwNavigationInitial(node: PnwNavigationNode): string {
  return Array.from((node.shortLabel ?? node.label).trim())[0] ?? "•";
}

function pnwHasChildren(node: PnwNavigationNode): boolean {
  return pnwVisibleNavigationNodes(node.children ?? []).length > 0;
}

function pnwContainsActive(node: PnwNavigationNode): boolean {
  return Boolean(props.activeNodeId && pnwNavigationNodeContains(node, props.activeNodeId));
}

function pnwToggleExpanded(nodeId: string): void {
  const next = new Set(props.expandedNodeIds);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  emit("update:expandedNodeIds", [...next]);
}

function pnwCancelFlyoutOpen(): void {
  if (pnwFlyoutOpenTimer === undefined) return;
  clearTimeout(pnwFlyoutOpenTimer);
  pnwFlyoutOpenTimer = undefined;
}

function pnwCancelFlyoutClose(): void {
  if (pnwFlyoutCloseTimer === undefined) return;
  clearTimeout(pnwFlyoutCloseTimer);
  pnwFlyoutCloseTimer = undefined;
}

function pnwCloseFlyout(restoreFocus = false): void {
  pnwCancelFlyoutOpen();
  pnwCancelFlyoutClose();
  const rootId = pnwOpenRootId.value;
  pnwOpenRootId.value = "";
  if (restoreFocus && rootId) void nextTick(() => pnwRootButtons.get(rootId)?.focus());
}

function pnwPositionFlyout(): void {
  if (typeof window === "undefined" || !pnwOpenRootId.value) return;
  const trigger = pnwRootButtons.get(pnwOpenRootId.value);
  const panel = pnwFlyout.value;
  if (!trigger || !panel) return;
  const triggerRect = trigger.getBoundingClientRect();
  pnwFlyoutPosition.value = pnwClampFloatingPanelPosition(
    { x: triggerRect.right + 6, y: triggerRect.top },
    { width: panel.offsetWidth, height: panel.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
  );
}

async function pnwOpenFlyout(node: PnwNavigationNode, focusFirst: boolean): Promise<void> {
  if (node.disabled || !pnwHasChildren(node)) return;
  const preserveFlyoutFocus = typeof document !== "undefined"
    && document.activeElement instanceof Node
    && Boolean(pnwFlyout.value?.contains(document.activeElement));
  pnwCancelFlyoutOpen();
  pnwCancelFlyoutClose();
  pnwOpenRootId.value = node.id;
  await nextTick();
  pnwPositionFlyout();
  if (focusFirst || preserveFlyoutFocus) {
    pnwFlyoutButtons.get(pnwFlyoutRows.value[0]?.node.id ?? "")?.focus();
  }
}

async function pnwActivateRailNode(node: PnwNavigationNode): Promise<void> {
  if (node.disabled) return;
  if (props.mode === "root-flyout" && pnwHasChildren(node)) {
    if (pnwOpenRootId.value === node.id) {
      pnwCloseFlyout(true);
      return;
    }
    await pnwOpenFlyout(node, true);
    return;
  }
  emit("activate", node.id);
}

function pnwScheduleFlyoutOpen(event: PointerEvent, node: PnwNavigationNode): void {
  if (
    props.mode !== "root-flyout"
    || !pnwCanHoverActivityTreeFlyout(event.pointerType)
  ) return;
  if (node.disabled || !pnwHasChildren(node)) {
    pnwScheduleFlyoutClose(event);
    return;
  }

  pnwCancelFlyoutClose();
  pnwCancelFlyoutOpen();
  const delay = pnwResolveActivityTreeFlyoutOpenDelay(pnwOpenRootId.value, node.id);
  if (delay === null) return;
  pnwFlyoutOpenTimer = setTimeout(() => {
    pnwFlyoutOpenTimer = undefined;
    void pnwOpenFlyout(node, false);
  }, delay);
}

function pnwScheduleFlyoutClose(event?: PointerEvent): void {
  if (event && !pnwCanHoverActivityTreeFlyout(event.pointerType)) return;
  pnwCancelFlyoutOpen();
  pnwCancelFlyoutClose();
  if (!pnwOpenRootId.value) return;
  pnwFlyoutCloseTimer = setTimeout(() => {
    pnwFlyoutCloseTimer = undefined;
    pnwCloseFlyout();
  }, PNW_ACTIVITY_TREE_FLYOUT_CLOSE_DELAY_MS);
}

function pnwHandleRailFocus(node: PnwNavigationNode): void {
  if (
    props.mode !== "root-flyout"
    || !pnwOpenRootId.value
    || pnwOpenRootId.value === node.id
  ) return;
  if (node.disabled || !pnwHasChildren(node)) {
    pnwCloseFlyout();
    return;
  }
  void pnwOpenFlyout(node, false);
}

function pnwActivateFlyoutNode(node: PnwNavigationNode, hasChildren: boolean): void {
  if (node.disabled) return;
  if (hasChildren) {
    pnwToggleExpanded(node.id);
    return;
  }
  emit("activate", node.id);
  pnwCloseFlyout();
}

function pnwFocusRail(index: number): void {
  const node = pnwRailNodes.value[index];
  if (node) pnwRootButtons.get(node.id)?.focus();
}

function pnwHandleRailKeydown(event: KeyboardEvent, index: number): void {
  let handled = true;
  switch (event.key) {
    case "ArrowDown":
      pnwFocusRail(Math.min(index + 1, pnwRailNodes.value.length - 1));
      break;
    case "ArrowUp":
      pnwFocusRail(Math.max(index - 1, 0));
      break;
    case "Home":
      pnwFocusRail(0);
      break;
    case "End":
      pnwFocusRail(pnwRailNodes.value.length - 1);
      break;
    case "Escape":
      pnwCloseFlyout(true);
      break;
    default:
      handled = false;
  }
  if (handled) event.preventDefault();
}

function pnwFocusFlyout(index: number): void {
  const row = pnwFlyoutRows.value[index];
  if (row) pnwFlyoutButtons.get(row.node.id)?.focus();
}

async function pnwHandleFlyoutKeydown(event: KeyboardEvent, index: number): Promise<void> {
  const row = pnwFlyoutRows.value[index];
  if (!row) return;
  const expanded = props.expandedNodeIds.includes(row.node.id);
  let handled = true;
  switch (event.key) {
    case "ArrowDown":
      pnwFocusFlyout(Math.min(index + 1, pnwFlyoutRows.value.length - 1));
      break;
    case "ArrowUp":
      pnwFocusFlyout(Math.max(index - 1, 0));
      break;
    case "Home":
      pnwFocusFlyout(0);
      break;
    case "End":
      pnwFocusFlyout(pnwFlyoutRows.value.length - 1);
      break;
    case "ArrowRight":
      if (!row.hasChildren) break;
      if (!expanded) {
        pnwToggleExpanded(row.node.id);
        await nextTick();
        pnwPositionFlyout();
      } else {
        pnwFocusFlyout(index + 1);
      }
      break;
    case "ArrowLeft":
      if (row.hasChildren && expanded) pnwToggleExpanded(row.node.id);
      else if (row.parentId) {
        pnwFocusFlyout(pnwFlyoutRows.value.findIndex(({ node }) => node.id === row.parentId));
      } else pnwCloseFlyout(true);
      break;
    case "Escape":
      pnwCloseFlyout(true);
      break;
    case "Enter":
    case " ":
      pnwActivateFlyoutNode(row.node, row.hasChildren);
      await nextTick();
      pnwPositionFlyout();
      break;
    default:
      handled = false;
  }
  if (handled) event.preventDefault();
}

function pnwHandleDocumentPointer(event: PointerEvent): void {
  pnwCancelFlyoutOpen();
  if (!(event.target instanceof Node) || !pnwOpenRootId.value) return;
  if (pnwFlyout.value?.contains(event.target)) return;
  if (pnwRootButtons.get(pnwOpenRootId.value)?.contains(event.target)) return;
  pnwCloseFlyout();
}

function pnwHandleViewportChange(): void {
  if (pnwOpenRootId.value) pnwPositionFlyout();
}

watch(() => props.mode, () => pnwCloseFlyout());
watch(pnwRootNodes, (roots) => {
  if (pnwOpenRootId.value && !roots.some((root) => root.id === pnwOpenRootId.value)) {
    pnwCloseFlyout();
  }
});

onMounted(() => {
  document.addEventListener("pointerdown", pnwHandleDocumentPointer);
  window.addEventListener("resize", pnwHandleViewportChange);
  document.addEventListener("scroll", pnwHandleViewportChange, true);
});

onBeforeUnmount(() => {
  pnwCloseFlyout();
  document.removeEventListener("pointerdown", pnwHandleDocumentPointer);
  window.removeEventListener("resize", pnwHandleViewportChange);
  document.removeEventListener("scroll", pnwHandleViewportChange, true);
});
</script>

<template>
  <div
    class="pnw-activity-tree-rail"
    :data-pnw-activity-tree-rail-mode="mode"
    role="toolbar"
    aria-orientation="vertical"
    :aria-label="ariaLabel"
    @pointerenter="pnwCancelFlyoutClose"
    @pointerleave="pnwScheduleFlyoutClose"
  >
    <button
      v-for="(node, index) in pnwRailNodes"
      :key="node.id"
      :ref="(element) => pnwSetButton(pnwRootButtons, node.id, element)"
      type="button"
      class="pnw-activity-tree-rail-item"
      :class="{
        'pnw-activity-tree-rail-item--active': pnwContainsActive(node),
        'pnw-activity-tree-rail-item--disabled': node.disabled,
      }"
      :disabled="node.disabled"
      :aria-label="node.label"
      :aria-current="node.id === activeNodeId ? 'page' : undefined"
      :aria-haspopup="mode === 'root-flyout' && pnwHasChildren(node) ? 'tree' : undefined"
      :aria-expanded="mode === 'root-flyout' && pnwHasChildren(node)
        ? pnwOpenRootId === node.id
        : undefined"
      :title="node.label"
      @click="pnwActivateRailNode(node)"
      @pointerenter="pnwScheduleFlyoutOpen($event, node)"
      @focus="pnwHandleRailFocus(node)"
      @keydown="pnwHandleRailKeydown($event, index)"
    >
      <span class="pnw-activity-tree-rail-icon" aria-hidden="true">
        <template v-if="node.icon !== undefined">
          <PnwIconRenderer :icon="node.icon" size="100%" decorative />
        </template>
        <span v-else>{{ pnwNavigationInitial(node) }}</span>
      </span>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="mode === 'root-flyout' && pnwOpenRoot"
      ref="pnwFlyout"
      class="pnw-activity-tree-flyout"
      :class="`pnw-activity-tree-flyout--${colorScheme}`"
      :style="{ left: `${pnwFlyoutPosition.x}px`, top: `${pnwFlyoutPosition.y}px` }"
      role="tree"
      :aria-label="`${pnwOpenRoot.label} 子菜单`"
      @pointerenter="pnwCancelFlyoutClose"
      @pointerleave="pnwScheduleFlyoutClose"
    >
      <div class="pnw-activity-tree-flyout-title">{{ pnwOpenRoot.label }}</div>
      <button
        v-for="(row, index) in pnwFlyoutRows"
        :key="row.node.id"
        :ref="(element) => pnwSetButton(pnwFlyoutButtons, row.node.id, element)"
        type="button"
        role="treeitem"
        class="pnw-activity-tree-flyout-item"
        :class="{
          'pnw-activity-tree-flyout-item--active': row.node.id === activeNodeId,
          'pnw-activity-tree-flyout-item--active-path': pnwContainsActive(row.node),
          'pnw-activity-tree-flyout-item--disabled': row.node.disabled,
        }"
        :style="{ '--pnw-activity-tree-depth': row.depth }"
        :disabled="row.node.disabled"
        :tabindex="row.node.id === activeNodeId || (!activeNodeId && index === 0) ? 0 : -1"
        :aria-level="row.depth"
        :aria-expanded="row.hasChildren ? expandedNodeIds.includes(row.node.id) : undefined"
        :aria-current="row.node.id === activeNodeId ? 'page' : undefined"
        @click="pnwActivateFlyoutNode(row.node, row.hasChildren)"
        @keydown="pnwHandleFlyoutKeydown($event, index)"
      >
        <span v-if="row.node.icon !== undefined" class="pnw-activity-tree-flyout-icon" aria-hidden="true">
          <PnwIconRenderer :icon="row.node.icon" size="100%" decorative />
        </span>
        <span class="pnw-activity-tree-flyout-label">{{ row.node.label }}</span>
        <PnwIcon
          v-if="row.hasChildren"
          :name="expandedNodeIds.includes(row.node.id) ? 'chevron-down' : 'chevron-right'"
          :size="12"
        />
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.pnw-activity-tree-rail {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px 4px;
}

.pnw-activity-tree-rail-item {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 6px);
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
  font: inherit;
}

.pnw-activity-tree-rail-item:hover,
.pnw-activity-tree-rail-item:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-activity-tree-rail-item:focus-visible {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

.pnw-activity-tree-rail-item--active {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
}

.pnw-activity-tree-rail-item--disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.pnw-activity-tree-rail-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.pnw-activity-tree-rail-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.pnw-activity-tree-flyout {
  position: fixed;
  z-index: 1600;
  width: min(260px, calc(100vw - 16px));
  max-height: min(440px, calc(100vh - 16px));
  overflow: auto;
  box-sizing: border-box;
  padding: 5px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: 7px;
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
}

.pnw-activity-tree-flyout--dark {
  color-scheme: dark;
  --pnw-workbench-surface: #111827;
  --pnw-workbench-text: #e5edf7;
  --pnw-workbench-muted: #94a3b8;
  --pnw-workbench-border: #2a3a50;
  --pnw-control-hover-bg: rgba(96, 165, 250, 0.14);
  --pnw-control-active-bg: rgba(59, 130, 246, 0.24);
  --pnw-control-active-text: #bfdbfe;
}

.pnw-activity-tree-flyout-title {
  overflow: hidden;
  padding: 5px 8px 7px;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-activity-tree-flyout-item {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px 0 calc(8px + (var(--pnw-activity-tree-depth) - 1) * 16px);
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.pnw-activity-tree-flyout-item:hover,
.pnw-activity-tree-flyout-item:focus-visible,
.pnw-activity-tree-flyout-item--active-path {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-activity-tree-flyout-item--active {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
  font-weight: 700;
}

.pnw-activity-tree-flyout-item--disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.pnw-activity-tree-flyout-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
}

.pnw-activity-tree-flyout-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .pnw-activity-tree-flyout--system {
    color-scheme: dark;
    --pnw-workbench-surface: #111827;
    --pnw-workbench-text: #e5edf7;
    --pnw-workbench-muted: #94a3b8;
    --pnw-workbench-border: #2a3a50;
    --pnw-control-hover-bg: rgba(96, 165, 250, 0.14);
    --pnw-control-active-bg: rgba(59, 130, 246, 0.24);
    --pnw-control-active-text: #bfdbfe;
  }
}
</style>
