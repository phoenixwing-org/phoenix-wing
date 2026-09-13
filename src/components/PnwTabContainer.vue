<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  ref,
  watch,
} from "vue";
import type {
  PnwTabActivationReason,
  PnwTabDefinition,
  PnwTabLabelSlotProps,
  PnwTabPanelSlotProps,
} from "../types/PnwTabContainer.js";

let PNW_TAB_CONTAINER_SEQUENCE = 0;

const props = withDefaults(defineProps<{
  tabs: readonly PnwTabDefinition[];
  /** 完全受控的活动页签 ID。无效或 disabled 时呈现第一个可用页签。 */
  activeTabId?: string;
  /** tablist 的可访问名称；对话框内也建议显式提供。 */
  ariaLabel?: string;
  /** true 时页签首次激活才挂载；挂载后仅隐藏，不销毁内容。 */
  lazyMount?: boolean;
  /** 默认由当前 tabpanel 滚动；iframe/虚拟列表自行滚动时设为 false。 */
  panelScrollable?: boolean;
}>(), {
  activeTabId: "",
  ariaLabel: "",
  lazyMount: false,
  panelScrollable: true,
});

const emit = defineEmits<{
  "update:activeTabId": [tabId: string];
  change: [tabId: string, previousTabId: string | undefined, reason: PnwTabActivationReason];
}>();

defineSlots<{
  default?(props: PnwTabPanelSlotProps): unknown;
  tab?(props: PnwTabLabelSlotProps): unknown;
  empty?(): unknown;
}>();

const pnwInstanceId = `pnw-tab-container-${getCurrentInstance()?.uid ?? ++PNW_TAB_CONTAINER_SEQUENCE}`;
const pnwTabElements = new Map<string, HTMLButtonElement>();
const pnwMountedTabIds = ref<readonly string[]>([]);

const pnwTabs = computed<readonly PnwTabDefinition[]>(() => {
  const ids = new Set<string>();
  for (const tab of props.tabs) {
    if (!tab.id.trim()) throw new TypeError("PnwTabContainer tab id must not be empty");
    if (!tab.title.trim()) throw new TypeError(`PnwTabContainer tab title must not be empty: ${tab.id}`);
    if (ids.has(tab.id)) throw new TypeError(`duplicate PnwTabContainer tab id: ${tab.id}`);
    ids.add(tab.id);
  }
  return props.tabs;
});
const pnwEnabledTabs = computed(() => pnwTabs.value.filter((tab) => !tab.disabled));
const pnwActiveTab = computed(() => (
  pnwEnabledTabs.value.find((tab) => tab.id === props.activeTabId)
  ?? pnwEnabledTabs.value[0]
));
const pnwActiveTabId = computed(() => pnwActiveTab.value?.id);

watch(
  () => [pnwTabs.value, props.lazyMount, pnwActiveTabId.value] as const,
  ([tabs, lazyMount, activeTabId]) => {
    const currentIds = new Set(tabs.map((tab) => tab.id));
    const mounted = lazyMount
      ? pnwMountedTabIds.value.filter((id) => currentIds.has(id))
      : tabs.map((tab) => tab.id);
    pnwMountedTabIds.value = activeTabId && !mounted.includes(activeTabId)
      ? [...mounted, activeTabId]
      : mounted;
  },
  { immediate: true },
);

function pnwDomSegment(tabId: string): string {
  return [...tabId].map((character) => (
    (character.codePointAt(0) ?? 0).toString(16).padStart(6, "0")
  )).join("-");
}

function pnwTabDomId(tabId: string): string {
  return `${pnwInstanceId}-tab-${pnwDomSegment(tabId)}`;
}

function pnwPanelDomId(tabId: string): string {
  return `${pnwInstanceId}-panel-${pnwDomSegment(tabId)}`;
}

function pnwSetTabElement(tabId: string, element: unknown): void {
  if (element instanceof HTMLButtonElement) pnwTabElements.set(tabId, element);
  else pnwTabElements.delete(tabId);
}

function pnwIsMounted(tabId: string): boolean {
  return !props.lazyMount || pnwMountedTabIds.value.includes(tabId);
}

function pnwRequestActivation(tab: PnwTabDefinition, reason: PnwTabActivationReason): void {
  if (tab.disabled || tab.id === pnwActiveTabId.value) return;
  const previousTabId = pnwActiveTabId.value;
  if (!pnwMountedTabIds.value.includes(tab.id)) {
    pnwMountedTabIds.value = [...pnwMountedTabIds.value, tab.id];
  }
  emit("update:activeTabId", tab.id);
  emit("change", tab.id, previousTabId, reason);
}

async function pnwFocusAndActivate(
  tab: PnwTabDefinition | undefined,
  reason: PnwTabActivationReason,
): Promise<void> {
  if (!tab) return;
  pnwRequestActivation(tab, reason);
  await nextTick();
  pnwTabElements.get(tab.id)?.focus({ preventScroll: true });
}

function pnwHandleTabKeydown(event: KeyboardEvent, tabId: string): void {
  const tabs = pnwEnabledTabs.value;
  if (tabs.length === 0) return;
  const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === tabId));
  let target: PnwTabDefinition | undefined;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    target = tabs[(currentIndex + 1) % tabs.length];
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    target = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
  } else if (event.key === "Home") {
    target = tabs[0];
  } else if (event.key === "End") {
    target = tabs.at(-1);
  } else {
    return;
  }
  event.preventDefault();
  void pnwFocusAndActivate(target, "keyboard");
}

function pnwFocusTab(tabId: string): void {
  pnwTabElements.get(tabId)?.focus({ preventScroll: true });
}

defineExpose({ focusTab: pnwFocusTab });
</script>

<template>
  <section
    class="pnw-tab-container"
    :class="{ 'pnw-tab-container--panel-scroll': panelScrollable }"
  >
    <div
      class="pnw-tab-container__tablist"
      role="tablist"
      aria-orientation="horizontal"
      :aria-label="ariaLabel || undefined"
    >
      <button
        v-for="tab in pnwTabs"
        :id="pnwTabDomId(tab.id)"
        :ref="(element) => pnwSetTabElement(tab.id, element)"
        :key="tab.id"
        type="button"
        class="pnw-tab-container__tab"
        role="tab"
        :data-pnw-tab-id="tab.id"
        :aria-selected="tab.id === pnwActiveTabId ? 'true' : 'false'"
        :aria-controls="pnwPanelDomId(tab.id)"
        :tabindex="tab.id === pnwActiveTabId ? 0 : -1"
        :disabled="tab.disabled"
        @click="pnwRequestActivation(tab, 'pointer')"
        @keydown="pnwHandleTabKeydown($event, tab.id)"
      >
        <slot
          name="tab"
          :tab="tab"
          :active="tab.id === pnwActiveTabId"
          :disabled="Boolean(tab.disabled)"
        >
          {{ tab.title }}
        </slot>
      </button>
    </div>

    <div v-if="pnwActiveTab" class="pnw-tab-container__panels">
      <template v-for="tab in pnwTabs" :key="tab.id">
        <div
          v-if="pnwIsMounted(tab.id)"
          :id="pnwPanelDomId(tab.id)"
          class="pnw-tab-container__panel"
          role="tabpanel"
          tabindex="0"
          :data-pnw-tab-panel-id="tab.id"
          :aria-labelledby="pnwTabDomId(tab.id)"
          :hidden="tab.id !== pnwActiveTabId"
        >
          <slot :tab="tab" :active="tab.id === pnwActiveTabId" />
        </div>
      </template>
    </div>
    <div v-else class="pnw-tab-container__empty">
      <slot name="empty" />
    </div>
  </section>
</template>

<style scoped>
.pnw-tab-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  background: var(--pnw-editor-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
}

.pnw-tab-container__tablist {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: var(--pnw-tab-gap, 2px);
  min-width: 0;
  min-height: var(--pnw-tab-list-height, 34px);
  padding: var(--pnw-tab-list-padding, 3px 6px 0);
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: var(--pnw-tab-list-bg, var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f8fafc)));
  scrollbar-width: thin;
}

.pnw-tab-container__tab {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: var(--pnw-tab-min-width, 72px);
  min-height: 30px;
  padding: 4px 12px;
  border: 0;
  border-radius: var(--pnw-tab-radius, 5px 5px 0 0);
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font: inherit;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.pnw-tab-container__tab:hover:not(:disabled) {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(148, 163, 184, 0.14)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-tab-container__tab[aria-selected="true"] {
  background: var(--pnw-tab-active-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff)));
  color: var(--pnw-tab-active-text, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a)));
  font-weight: 600;
}

.pnw-tab-container__tab[aria-selected="true"]::after {
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--pnw-tab-active-border, var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6)));
  content: "";
}

.pnw-tab-container__tab:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

.pnw-tab-container__tab:disabled {
  opacity: 0.46;
  cursor: default;
}

.pnw-tab-container__panels,
.pnw-tab-container__panel,
.pnw-tab-container__empty {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
}

.pnw-tab-container__panels {
  position: relative;
  overflow: hidden;
}

.pnw-tab-container__panel {
  height: 100%;
  overflow: hidden;
  outline: none;
}

.pnw-tab-container--panel-scroll .pnw-tab-container__panel {
  overflow: auto;
  overscroll-behavior: contain;
}

.pnw-tab-container__panel[hidden] {
  display: none;
}

.pnw-tab-container__empty {
  overflow: auto;
}
</style>
