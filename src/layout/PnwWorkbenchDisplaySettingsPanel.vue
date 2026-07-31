<script setup lang="ts">
import { computed } from "vue";
import PnwFloatingPanel from "../components/PnwFloatingPanel.vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwActivityTreeCollapsedMode,
  PnwActivityTreeExpandedMode,
  PnwRibbonAppearance,
  PnwRibbonIconSize,
  PnwRibbonMode,
  PnwRibbonModeAppearance,
  PnwWorkbenchTabBarPlacement,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  pnwRibbonIconSizesFor,
  pnwValidateRibbonAppearance,
} from "../utils/pnwWorkbenchWeb.js";

const props = withDefaults(defineProps<{
  open: boolean;
  position: PnwFloatingPanelPosition;
  presentation: PnwActivityBarPresentation;
  /** Shell 响应式覆盖后的实际呈现；窄屏缺省为 Ribbon。 */
  effectivePresentation?: PnwActivityBarPresentation;
  responsiveNarrow?: boolean;
  appearance: PnwRibbonAppearance;
  treeAppearance: PnwActivityTreeAppearance;
  tabBarPlacement?: PnwWorkbenchTabBarPlacement;
  colorScheme: PnwColorScheme;
  showLayoutSettings?: boolean;
}>(), {
  tabBarPlacement: PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  showLayoutSettings: false,
  responsiveNarrow: false,
});

const emit = defineEmits<{
  close: [];
  "update:position": [position: PnwFloatingPanelPosition];
  "update:presentation": [presentation: PnwActivityBarPresentation];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:tabBarPlacement": [placement: PnwWorkbenchTabBarPlacement];
  "update:colorScheme": [colorScheme: PnwColorScheme];
}>();

defineSlots<{
  "additional-sections"(): unknown;
}>();

const pnwPresentations = ["ribbon", "tree"] as const;
const pnwColorSchemes = ["light", "dark", "system"] as const;
const pnwTabBarPlacements = [
  "header",
  "after-navigation",
  "editor-bottom",
] as const satisfies readonly PnwWorkbenchTabBarPlacement[];
const pnwTabBarPlacementLabels: Readonly<Record<PnwWorkbenchTabBarPlacement, string>> = {
  header: "Header 内",
  "after-navigation": "导航后",
  "editor-bottom": "Editor 底部",
};
const pnwActiveAppearance = computed(() => props.appearance[props.appearance.mode]);
const pnwDisplayedPresentation = computed<PnwActivityBarPresentation>(() => (
  props.responsiveNarrow
    ? props.effectivePresentation ?? "ribbon"
    : props.presentation
));
const pnwPreferredPresentationLabel = computed(() => (
  props.presentation === "tree" ? "侧面目录树" : "顶部 Ribbon"
));
const pnwAllowedIconSizes = computed(() => pnwRibbonIconSizesFor(props.appearance.mode));
const pnwPanelClass = computed(() => [
  "pnw-workbench-display-full-panel",
  `pnw-workbench-display-full-panel--${props.colorScheme}`,
].join(" "));
const pnwRibbonDescription = computed(() => {
  if (props.appearance.mode === "compact") return "紧凑工具条";
  return pnwActiveAppearance.value.showTitles
    ? "大 Ribbon · 带 Title"
    : "大 Ribbon · 仅图标";
});

function pnwUpdateRibbonMode(mode: PnwRibbonMode): void {
  emit("update:appearance", { ...props.appearance, mode });
}

function pnwUpdateTreeExpandedMode(expanded: PnwActivityTreeExpandedMode): void {
  emit("update:treeAppearance", { ...props.treeAppearance, expanded });
}

function pnwUpdateTreeCollapsedMode(collapsed: PnwActivityTreeCollapsedMode): void {
  emit("update:treeAppearance", { ...props.treeAppearance, collapsed });
}

function pnwUpdateActiveAppearance(patch: Partial<PnwRibbonModeAppearance>): void {
  const mode = props.appearance.mode;
  emit("update:appearance", pnwValidateRibbonAppearance({
    ...props.appearance,
    [mode]: {
      ...props.appearance[mode],
      ...patch,
    },
  }).appearance);
}

function pnwUpdateIconSize(iconSize: PnwRibbonIconSize): void {
  pnwUpdateActiveAppearance({ iconSize });
}

function pnwUpdateFlag(
  key: "showTitles" | "showGroupLabels",
  event: Event,
): void {
  pnwUpdateActiveAppearance({
    [key]: (event.target as HTMLInputElement).checked,
  });
}
</script>

<template>
  <PnwFloatingPanel
    :open="open"
    :position="position"
    aria-label="工作台显示设置"
    :panel-class="pnwPanelClass"
    @update:position="emit('update:position', $event)"
    @close="emit('close')"
  >
    <template #header>
      <div class="pnw-workbench-display-full-title">
        <strong>工作台显示设置</strong>
        <span>拖动这里可边看边调</span>
      </div>
      <button
        type="button"
        class="pnw-workbench-display-full-done"
        @pointerdown.stop
        @click="emit('close')"
      >
        完成
      </button>
    </template>

    <section class="pnw-workbench-display-full">
      <div class="pnw-workbench-display-full-grid">
        <details class="pnw-workbench-display-full-section" open>
          <summary class="pnw-workbench-display-full-section-head">
            <h3>导航结构</h3>
            <span>同一份 PnwNavigationNode</span>
          </summary>
          <div class="pnw-workbench-display-full-section-body">
            <div class="pnw-workbench-display-full-controls" aria-label="导航呈现">
              <button
                v-for="item in pnwPresentations"
                :key="item"
                type="button"
                :class="{
                  'pnw-workbench-display-full-control--active':
                    pnwDisplayedPresentation === item,
                }"
                :aria-pressed="pnwDisplayedPresentation === item"
                :disabled="responsiveNarrow"
                :title="responsiveNarrow
                  ? '窄屏固定使用顶部 Ribbon'
                  : undefined"
                @click="emit('update:presentation', item)"
              >
                {{ item === "ribbon" ? "顶部 Ribbon" : "侧面目录树" }}
              </button>
            </div>
            <small
              v-if="responsiveNarrow"
              class="pnw-workbench-display-full-hint"
            >
              窄屏固定使用顶部 Ribbon，导航结构暂不可切换；恢复宽屏后使用原偏好：{{ pnwPreferredPresentationLabel }}。
            </small>
            <div class="pnw-workbench-display-full-option">
              <span>目录展开外观</span>
              <div class="pnw-workbench-display-full-controls" aria-label="目录展开外观">
                <button
                  v-for="mode in (['outline', 'admin-menu'] as const)"
                  :key="mode"
                  type="button"
                  :class="{
                    'pnw-workbench-display-full-control--active':
                      treeAppearance.expanded === mode,
                  }"
                  :aria-pressed="treeAppearance.expanded === mode"
                  @click="pnwUpdateTreeExpandedMode(mode)"
                >
                  {{ mode === "outline" ? "紧凑大纲树" : "Admin 菜单" }}
                </button>
              </div>
            </div>
            <div class="pnw-workbench-display-full-option">
              <span>目录收起外观</span>
              <div class="pnw-workbench-display-full-controls" aria-label="目录收起外观">
                <button
                  v-for="mode in (['leaf-rail', 'root-flyout'] as const)"
                  :key="mode"
                  type="button"
                  :class="{
                    'pnw-workbench-display-full-control--active':
                      treeAppearance.collapsed === mode,
                  }"
                  :aria-pressed="treeAppearance.collapsed === mode"
                  @click="pnwUpdateTreeCollapsedMode(mode)"
                >
                  {{ mode === "leaf-rail"
                    ? "所有叶子图标"
                    : "一级菜单 + 子菜单浮层" }}
                </button>
              </div>
            </div>
            <small class="pnw-workbench-display-full-hint">
              两项始终可预设；分别在目录展开或收起时生效。
            </small>
          </div>
        </details>

        <details
          v-if="showLayoutSettings"
          class="pnw-workbench-display-full-section"
          open
        >
          <summary class="pnw-workbench-display-full-section-head">
            <h3>View 标签位置</h3>
            <span>{{ pnwTabBarPlacementLabels[tabBarPlacement] }}</span>
          </summary>
          <div class="pnw-workbench-display-full-section-body">
            <div
              class="pnw-workbench-display-full-controls pnw-workbench-display-full-controls--wrap"
              aria-label="View 标签位置"
            >
              <button
                v-for="placement in pnwTabBarPlacements"
                :key="placement"
                type="button"
                :class="{
                  'pnw-workbench-display-full-control--active':
                    tabBarPlacement === placement,
                }"
                :aria-pressed="tabBarPlacement === placement"
                @click="emit('update:tabBarPlacement', placement)"
              >
                {{ pnwTabBarPlacementLabels[placement] }}
              </button>
            </div>
            <small class="pnw-workbench-display-full-hint">
              同一组受控 View 标签只渲染一次；Tree 模式的“导航后”位于 Editor 顶部。
            </small>
          </div>
        </details>

        <details class="pnw-workbench-display-full-section">
          <summary class="pnw-workbench-display-full-section-head">
            <h3>颜色主题</h3>
            <span>宿主 CSS token</span>
          </summary>
          <div class="pnw-workbench-display-full-section-body">
            <div class="pnw-workbench-display-full-controls" aria-label="颜色主题">
              <button
                v-for="scheme in pnwColorSchemes"
                :key="scheme"
                type="button"
                :class="{
                  'pnw-workbench-display-full-control--active':
                    colorScheme === scheme,
                }"
                :aria-pressed="colorScheme === scheme"
                @click="emit('update:colorScheme', scheme)"
              >
                {{ scheme === "light" ? "白天" : scheme === "dark" ? "黑天" : "跟随系统" }}
              </button>
            </div>
          </div>
        </details>

        <details class="pnw-workbench-display-full-section" open>
          <summary class="pnw-workbench-display-full-section-head">
            <h3>Ribbon 高度与内容</h3>
            <span>{{ pnwRibbonDescription }} · {{ pnwActiveAppearance.iconSize }}px 图标</span>
          </summary>
          <div class="pnw-workbench-display-full-section-body">
            <div class="pnw-workbench-display-full-row">
              <div class="pnw-workbench-display-full-controls" aria-label="Ribbon 外观类别">
                <button
                  v-for="mode in (['ribbon', 'compact'] as const)"
                  :key="mode"
                  type="button"
                  :class="{
                    'pnw-workbench-display-full-control--active':
                      appearance.mode === mode,
                  }"
                  :aria-pressed="appearance.mode === mode"
                  @click="pnwUpdateRibbonMode(mode)"
                >
                  {{ mode === "ribbon" ? "大 Ribbon" : "紧凑工具条" }}
                </button>
              </div>
              <div class="pnw-workbench-display-full-controls" aria-label="Ribbon 图标尺寸">
                <button
                  v-for="size in pnwAllowedIconSizes"
                  :key="size"
                  type="button"
                  :class="{
                    'pnw-workbench-display-full-control--active':
                      pnwActiveAppearance.iconSize === size,
                  }"
                  :aria-pressed="pnwActiveAppearance.iconSize === size"
                  @click="pnwUpdateIconSize(size)"
                >
                  {{ size }}px
                </button>
              </div>
            </div>
            <div class="pnw-workbench-display-full-checks">
              <label>
                <input
                  type="checkbox"
                  :checked="pnwActiveAppearance.showTitles"
                  @change="pnwUpdateFlag('showTitles', $event)"
                >
                显示 Title
              </label>
              <label v-if="appearance.mode === 'ribbon'">
                <input
                  type="checkbox"
                  :checked="appearance.ribbon.showGroupLabels"
                  @change="pnwUpdateFlag('showGroupLabels', $event)"
                >
                Ribbon 分组标签
              </label>
              <span v-else>Title 不改变高度；紧凑工具条不显示分组标签。</span>
            </div>
          </div>
        </details>

        <slot name="additional-sections" />
      </div>

      <footer class="pnw-workbench-display-full-footer">
        <span>状态由宿主受控；Wing 不选择持久化介质。</span>
      </footer>
    </section>
  </PnwFloatingPanel>
</template>

<style scoped>
:global(.pnw-workbench-display-full-panel) {
  --pnw-floating-panel-width: 420px;
  --pnw-floating-panel-max-height: min(680px, calc(100vh - 16px));
  --pnw-workbench-surface: #fff;
  --pnw-workbench-bg: #f8fafc;
  --pnw-workbench-text: #0f172a;
  --pnw-workbench-muted: #64748b;
  --pnw-workbench-border: #dbe3ed;
  --pnw-control-active-text: #1d4ed8;
  --pnw-control-hover-bg: rgba(59, 130, 246, 0.09);
}

:global(.pnw-workbench-display-full-panel--dark) {
  color-scheme: dark;
  --pnw-workbench-surface: #111827;
  --pnw-workbench-bg: #0b1220;
  --pnw-workbench-text: #e5edf7;
  --pnw-workbench-muted: #94a3b8;
  --pnw-workbench-border: #2a3a50;
  --pnw-control-active-text: #bfdbfe;
  --pnw-control-hover-bg: rgba(96, 165, 250, 0.14);
}

.pnw-workbench-display-full-title {
  display: grid;
  gap: 1px;
}

.pnw-workbench-display-full-title strong {
  font-size: 13px;
}

.pnw-workbench-display-full-title span {
  color: var(--pnw-workbench-muted);
  font-size: 9px;
}

.pnw-workbench-display-full-done {
  min-width: 48px;
  height: 28px;
  flex: none;
  padding: 0 10px;
  border: 1px solid var(--pnw-control-active-text);
  border-radius: 5px;
  background: var(--pnw-control-active-text);
  color: var(--pnw-workbench-surface);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
}

.pnw-workbench-display-full-done:hover,
.pnw-workbench-display-full-done:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pnw-control-active-text) 35%, transparent);
  outline-offset: 1px;
}

.pnw-workbench-display-full {
  min-width: 0;
  color: var(--pnw-workbench-text);
}

.pnw-workbench-display-full-grid {
  display: grid;
  gap: 6px;
  padding: 8px;
}

.pnw-workbench-display-full-section {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border);
  border-radius: 7px;
  background: color-mix(in srgb, var(--pnw-workbench-surface) 88%, var(--pnw-workbench-bg) 12%);
}

.pnw-workbench-display-full-section-head {
  min-height: 34px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 10px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  cursor: pointer;
  list-style: none;
}

.pnw-workbench-display-full-section-head::-webkit-details-marker {
  display: none;
}

.pnw-workbench-display-full-section-head::after {
  color: var(--pnw-workbench-muted);
  content: "›";
  font-size: 16px;
  transition: transform 120ms ease;
}

.pnw-workbench-display-full-section[open] > .pnw-workbench-display-full-section-head::after {
  transform: rotate(90deg);
}

.pnw-workbench-display-full-section-head:hover,
.pnw-workbench-display-full-section-head:focus-visible {
  outline: 0;
  background: var(--pnw-control-hover-bg);
}

.pnw-workbench-display-full-section-head h3 {
  margin: 0;
  font-size: 13px;
}

.pnw-workbench-display-full-section-head span {
  overflow: hidden;
  color: var(--pnw-workbench-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-workbench-display-full-section-body {
  display: grid;
  gap: 8px;
  padding: 0 9px 9px;
}

.pnw-workbench-display-full-row,
.pnw-workbench-display-full-checks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pnw-workbench-display-full-option {
  display: grid;
  gap: 4px;
}

.pnw-workbench-display-full-option > span,
.pnw-workbench-display-full-hint {
  color: var(--pnw-workbench-muted);
  font-size: 10px;
}

.pnw-workbench-display-full-option .pnw-workbench-display-full-controls {
  width: fit-content;
}

.pnw-workbench-display-full-controls {
  display: inline-flex;
  max-width: 100%;
  padding: 2px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--pnw-workbench-text) 8%, transparent);
}

.pnw-workbench-display-full-controls--wrap {
  display: flex;
  flex-wrap: wrap;
  width: fit-content;
}

.pnw-workbench-display-full-controls button {
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--pnw-workbench-muted);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

.pnw-workbench-display-full-controls .pnw-workbench-display-full-control--active {
  background: var(--pnw-workbench-surface);
  color: var(--pnw-control-active-text);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  font-weight: 700;
}

.pnw-workbench-display-full-controls button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pnw-workbench-display-full-checks label {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 5px;
  color: var(--pnw-workbench-muted);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

.pnw-workbench-display-full-checks input {
  accent-color: var(--pnw-control-active-text);
}

.pnw-workbench-display-full-checks > span {
  color: var(--pnw-workbench-muted);
  font-size: 9px;
}

.pnw-workbench-display-full-footer {
  position: sticky;
  z-index: 1;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--pnw-workbench-border);
  background: var(--pnw-workbench-surface);
  color: var(--pnw-workbench-muted);
  font-size: 10px;
}

@media (prefers-color-scheme: dark) {
  :global(.pnw-workbench-display-full-panel--system) {
    color-scheme: dark;
    --pnw-workbench-surface: #111827;
    --pnw-workbench-bg: #0b1220;
    --pnw-workbench-text: #e5edf7;
    --pnw-workbench-muted: #94a3b8;
    --pnw-workbench-border: #2a3a50;
    --pnw-control-active-text: #bfdbfe;
    --pnw-control-hover-bg: rgba(96, 165, 250, 0.14);
  }
}
</style>
