<script setup lang="ts">
import { computed } from "vue";
import PnwFloatingPanel from "../components/PnwFloatingPanel.vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";
import type {
  PnwActivityBarPresentation,
  PnwRibbonAppearance,
  PnwRibbonIconSize,
  PnwRibbonMode,
  PnwRibbonModeAppearance,
} from "../types/PnwWorkbenchWeb.js";
import {
  pnwRibbonIconSizesFor,
  pnwValidateRibbonAppearance,
} from "../utils/pnwWorkbenchWeb.js";

const props = defineProps<{
  open: boolean;
  position: PnwFloatingPanelPosition;
  presentation: PnwActivityBarPresentation;
  appearance: PnwRibbonAppearance;
  colorScheme: PnwColorScheme;
}>();

const emit = defineEmits<{
  close: [];
  "update:position": [position: PnwFloatingPanelPosition];
  "update:presentation": [presentation: PnwActivityBarPresentation];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:colorScheme": [colorScheme: PnwColorScheme];
}>();

defineSlots<{
  "additional-sections"(): unknown;
}>();

const pnwPresentations = ["ribbon", "tree"] as const;
const pnwColorSchemes = ["light", "dark", "system"] as const;
const pnwActiveAppearance = computed(() => props.appearance[props.appearance.mode]);
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
                    presentation === item,
                }"
                :aria-pressed="presentation === item"
                @click="emit('update:presentation', item)"
              >
                {{ item === "ribbon" ? "顶部 Ribbon" : "侧面目录树" }}
              </button>
            </div>
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
        <button type="button" @click="emit('close')">完成</button>
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

.pnw-workbench-display-full-controls {
  display: inline-flex;
  max-width: 100%;
  padding: 2px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--pnw-workbench-text) 8%, transparent);
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
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--pnw-workbench-border);
  background: var(--pnw-workbench-surface);
  color: var(--pnw-workbench-muted);
  font-size: 10px;
}

.pnw-workbench-display-full-footer button {
  min-width: 72px;
  min-height: 30px;
  border: 0;
  border-radius: 6px;
  background: var(--pnw-control-active-text);
  color: var(--pnw-workbench-surface);
  cursor: pointer;
  font-weight: 700;
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
