<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { Component } from "vue";
import type { PnwWorkbenchTabItem } from "../types/PnwWorkbenchWeb.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "../components/PnwIcon.vue";

const props = withDefaults(
  defineProps<{
    /** Tab 列表 */
    tabs: readonly PnwWorkbenchTabItem[];
    /** 当前激活 Tab ID */
    activeTabId: string;
    /** pageId → 图标组件 */
    pageIcon?: (pageId: string) => Component | undefined;
    /** 是否嵌入 header 模式 */
    inHeader?: boolean;
    /** 可否新建 Tab */
    canAdd?: boolean;
    /** 可否关闭全部 */
    canCloseAll?: boolean;
    /** 全部关闭中 */
    closingAll?: boolean;
    /** Host 是否实现刷新当前标签。 */
    canRefreshActiveTab?: boolean;
    /** Host 是否实现关闭其他标签。 */
    canCloseOtherTabs?: boolean;
    /** 当前 Editor 是否处于工作台最大化状态。 */
    editorMaximized?: boolean;
    /** 是否显示 Wing 布局级最大化/还原动作。 */
    showEditorMaximizeAction?: boolean;
  }>(),
  {
    inHeader: false,
    canAdd: false,
    canCloseAll: false,
    closingAll: false,
    canRefreshActiveTab: false,
    canCloseOtherTabs: false,
    editorMaximized: false,
    showEditorMaximizeAction: false,
  },
);

const emit = defineEmits<{
  select: [tabId: string];
  close: [tabId: string];
  closeAll: [];
  closeOtherTabs: [];
  refreshActiveTab: [];
  newTab: [];
  "update:editorMaximized": [maximized: boolean];
}>();

const scrollEl = ref<HTMLElement | null>(null);
const tabEls = new Map<string, HTMLElement>();
const { t: pnwT } = usePnwLocale();

function setTabRef(tabId: string, el: Element | null) {
  if (el instanceof HTMLElement) tabEls.set(tabId, el);
  else tabEls.delete(tabId);
}

function scrollActiveIntoView(behavior: ScrollBehavior = "smooth") {
  const id = props.activeTabId;
  if (!id) return;
  const container = scrollEl.value;
  const el = tabEls.get(id);
  if (!container || !el) return;
  const pad = 6;
  const tabLeft = el.offsetLeft;
  const tabRight = tabLeft + el.offsetWidth;
  const viewLeft = container.scrollLeft;
  const viewRight = viewLeft + container.clientWidth;
  if (tabLeft < viewLeft + pad) {
    container.scrollTo({ left: Math.max(0, tabLeft - pad), behavior });
  } else if (tabRight > viewRight - pad) {
    container.scrollTo({ left: tabRight - container.clientWidth + pad, behavior });
  }
}

watch(() => props.activeTabId, () => { void nextTick(() => scrollActiveIntoView()); });
watch(() => props.tabs, () => { void nextTick(() => scrollActiveIntoView("auto")); }, { deep: true });
onMounted(() => { void nextTick(() => scrollActiveIntoView("auto")); });
</script>

<template>
  <div class="pnw-tab-bar" :class="{ 'pnw-tab-bar-header': inHeader }">
    <div ref="scrollEl" class="pnw-tab-scroll" role="tablist" :aria-label="pnwT('workbench.tabs')">
      <span v-if="inHeader" class="pnw-tab-scroll-edge" aria-hidden="true" />
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :ref="(el) => setTabRef(tab.id, el as Element | null)"
        type="button"
        class="pnw-tab-item"
        :class="{ active: tab.id === activeTabId, dirty: tab.dirty }"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        :title="tab.subtitle || tab.title"
        @click="emit('select', tab.id)"
      >
        <span v-if="pageIcon" class="pnw-tab-icon" aria-hidden="true">
          <component :is="pageIcon(tab.pageId)" />
        </span>
        <span class="pnw-tab-title">{{ tab.title }}</span>
        <span v-if="tab.dirty" class="pnw-tab-dot" :aria-label="pnwT('workbench.tab.unsaved')">●</span>
        <span class="pnw-tab-close" :title="pnwT('workbench.tab.close')" @click.stop="emit('close', tab.id)">×</span>
      </button>
      <span v-if="inHeader" class="pnw-tab-scroll-edge" aria-hidden="true" />
    </div>
    <div class="pnw-tab-actions" role="toolbar" :aria-label="pnwT('workbench.tab.actions')">
      <button
        v-if="canRefreshActiveTab"
        type="button"
        class="pnw-tab-action"
        :disabled="!activeTabId"
        :title="pnwT('workbench.tab.refresh')"
        :aria-label="pnwT('workbench.tab.refresh')"
        @click="emit('refreshActiveTab')"
      ><PnwIcon name="refresh" :size="16" /></button>
      <button
        v-if="canCloseOtherTabs"
        type="button"
        class="pnw-tab-action"
        :disabled="tabs.length <= 1 || !activeTabId"
        :title="pnwT('workbench.tab.closeOthers')"
        :aria-label="pnwT('workbench.tab.closeOthers')"
        @click="emit('closeOtherTabs')"
      ><PnwIcon name="close-others" :size="16" /></button>
      <button
        v-if="showEditorMaximizeAction"
        type="button"
        class="pnw-tab-action"
        :aria-pressed="editorMaximized"
        :title="pnwT(editorMaximized ? 'workbench.tab.restore' : 'workbench.tab.maximize')"
        :aria-label="pnwT(editorMaximized ? 'workbench.tab.restore' : 'workbench.tab.maximize')"
        @click="emit('update:editorMaximized', !editorMaximized)"
      ><PnwIcon :name="editorMaximized ? 'editor-restore' : 'editor-maximize'" :size="16" /></button>
    </div>
    <button
      v-if="canCloseAll"
      type="button"
      class="pnw-tab-close-all"
      :disabled="closingAll"
      :title="pnwT('workbench.tab.closeAll')"
      :aria-label="pnwT('workbench.tab.closeAll')"
      @click="emit('closeAll')"
    ><PnwIcon name="close" :size="16" /></button>
    <button
      v-if="canAdd"
      type="button"
      class="pnw-tab-add"
      :title="pnwT('workbench.tab.new')"
      :aria-label="pnwT('workbench.tab.new')"
      @click="emit('newTab')"
    >+</button>
  </div>
</template>

<style scoped>
.pnw-tab-bar {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 36px;
  padding: 4px 8px 0;
  background: var(--shell-bg, var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f1f5f9)));
  border-bottom: 1px solid var(--border, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0)));
  overflow: hidden;
}

.pnw-tab-scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  padding-right: 2px;
}

.pnw-tab-item {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  max-width: 220px;
  padding: 6px 8px 6px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--muted, var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)));
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.pnw-tab-item:hover { background: var(--nav-hover, var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(148,163,184,.15)))); color: var(--text, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #334155))); }
.pnw-tab-item.active { background: var(--page-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff))); border-color: var(--border, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0))); color: var(--text, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a))); margin-bottom: -1px; padding-bottom: 7px; }

.pnw-tab-title { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.pnw-tab-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex-shrink: 0; color: #94a3b8; }
.pnw-tab-icon :deep(svg) { width: 14px; height: 14px; }
.pnw-tab-item.active .pnw-tab-icon { color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #3b82f6)); }
.pnw-tab-dot { color: #f59e0b; font-size: .65rem; line-height: 1; }
.pnw-tab-close { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-left: 2px; border-radius: 4px; font-size: 1rem; line-height: 1; opacity: .55; }
.pnw-tab-close:hover { opacity: 1; background: rgba(148,163,184,.25); }

.pnw-tab-actions {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}

.pnw-tab-action {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted, var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b)));
  cursor: pointer;
}

.pnw-tab-action:hover:not(:disabled) {
  background: var(--nav-hover, var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(148,163,184,.15))));
  color: var(--text, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #334155)));
}

.pnw-tab-action:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

.pnw-tab-action:disabled {
  opacity: .38;
  cursor: default;
}

.pnw-tab-close-all, .pnw-tab-add {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  align-self: center; width: 28px; height: 28px; margin-left: 8px; padding: 0;
  border-radius: 6px; cursor: pointer;
}
.pnw-tab-close-all { border: 1px solid var(--border, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0))); background: var(--shell-bg, var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f1f5f9))); color: var(--muted, var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b))); }
.pnw-tab-close-all:hover:not(:disabled) { border-color: #f87171; color: #b91c1c; background: #fef2f2; }
.pnw-tab-close-all:disabled { opacity: .55; cursor: default; }
.pnw-tab-add { border: 1px dashed var(--border, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #e2e8f0))); background: var(--shell-bg, var(--pnw-workbench-bg, var(--pnw-workbench-default-bg, #f1f5f9))); color: var(--muted, var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b))); }
.pnw-tab-add:hover { border-color: var(--accent, var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6))); color: var(--accent, var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6))); }

/* header mode */
.pnw-tab-bar-header { flex: 1; min-width: 0; min-height: 0; height: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 2px 0 0; background: transparent; border-bottom: none; }
.pnw-tab-bar-header .pnw-tab-scroll { flex: 1 1 auto; width: 100%; max-width: 100%; min-width: 0; align-items: center; justify-content: flex-start; gap: 5px; min-height: 36px; padding: 4px 6px; border-radius: var(--phoenix-radius-md, 8px); background: var(--phoenix-ribbon-tab-track, color-mix(in srgb, var(--pnw-workbench-text, #0f172a) 5.5%, transparent)); box-shadow: inset 0 1px 2px var(--phoenix-border-subtle, color-mix(in srgb, var(--pnw-workbench-text, #0f172a) 5%, transparent)); }
.pnw-tab-bar-header .pnw-tab-item { max-width: 240px; height: 28px; padding: 0 10px 0 11px; gap: 6px; margin: 0; border-radius: calc(var(--phoenix-radius-md, 8px) - 2px); font-size: .74rem; font-weight: 500; transform: scale(.96); }
.pnw-tab-bar-header .pnw-tab-item:hover:not(.active) { background: var(--phoenix-ribbon-tab-hover, var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(255,255,255,.72)))); border-color: var(--pnw-workbench-border, rgba(148,163,184,.28)); color: var(--phoenix-text-secondary, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #334155))); transform: scale(.98); }
.pnw-tab-bar-header .pnw-tab-item.active { height: 32px; padding: 0 15px 0 13px; font-size: .78rem; font-weight: 600; margin-bottom: 0; padding-bottom: 0; transform: scale(1); z-index: 1; background: var(--phoenix-ribbon-tab-active-bg, var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff))); border-color: var(--phoenix-border-subtle, var(--pnw-workbench-border, var(--pnw-workbench-default-border, #c8d3e0))); color: var(--phoenix-text, var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a))); box-shadow: var(--phoenix-shadow-sm, 0 1px 3px rgba(15,23,42,.1)), inset 0 0 0 1px color-mix(in srgb, var(--pnw-workbench-surface, #fff) 65%, transparent); }
.pnw-tab-bar-header .pnw-tab-icon { width: 16px; height: 16px; }
.pnw-tab-bar-header .pnw-tab-icon :deep(svg) { width: 16px; height: 16px; }
.pnw-tab-bar-header .pnw-tab-item.active .pnw-tab-icon { color: var(--phoenix-accent-hover, var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #2563eb))); }
.pnw-tab-bar-header .pnw-tab-close { width: 16px; height: 16px; margin-left: 0; border-radius: 4px; font-size: .92rem; opacity: .45; }
.pnw-tab-bar-header .pnw-tab-item.active .pnw-tab-close { opacity: .6; }
.pnw-tab-bar-header .pnw-tab-close:hover { opacity: 1; background: rgba(148,163,184,.22); color: #334155; }
.pnw-tab-scroll-edge { flex: 1 1 0; min-width: 0; max-width: 48vw; pointer-events: none; }
</style>
