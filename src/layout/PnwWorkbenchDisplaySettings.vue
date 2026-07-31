<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import PnwFloatingPanel from "../components/PnwFloatingPanel.vue";
import PnwIcon from "../components/PnwIcon.vue";
import type { PnwIconName } from "../icons/pnwIconCatalog.js";
import type { PnwWorkbenchDisplaySettingsActionSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwRibbonAppearance,
  PnwWorkbenchDisplaySettingsPositions,
  PnwWorkbenchTabBarPlacement,
} from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_WORKBENCH_DISPLAY_SETTINGS_POSITIONS,
  PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
} from "../utils/pnwWorkbenchWeb.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";
import PnwWorkbenchDisplaySettingsPanel from "./PnwWorkbenchDisplaySettingsPanel.vue";

type PnwWorkbenchDisplayPreset = "tree" | "compact-icon" | "compact-title" | "ribbon";

const props = withDefaults(defineProps<{
  presentation: PnwActivityBarPresentation;
  /** Shell 响应式覆盖后的实际呈现；独立使用时缺省等于 presentation。 */
  effectivePresentation?: PnwActivityBarPresentation;
  responsiveNarrow?: boolean;
  appearance: PnwRibbonAppearance;
  treeAppearance?: PnwActivityTreeAppearance;
  tabBarPlacement?: PnwWorkbenchTabBarPlacement;
  colorScheme: PnwColorScheme;
  triggerVariant: "ribbon" | "tree" | "rail";
  /** @deprecated 公共完整设置已内置；该入口只兼容 consumer 的旧扩展事件。 */
  showAdvancedSettingsAction?: boolean;
  /** 仅 Shell 级所有者开启；ActivityBar 独立使用时不显示壳层位置设置。 */
  showLayoutSettings?: boolean;
  /** 可选受控位置；consumer 可放入 Pinia 并自行选择持久化介质。 */
  positions?: PnwWorkbenchDisplaySettingsPositions;
}>(), {
  treeAppearance: () => PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  tabBarPlacement: PNW_DEFAULT_WORKBENCH_TAB_BAR_PLACEMENT,
  showLayoutSettings: false,
  responsiveNarrow: false,
});

const emit = defineEmits<{
  "update:presentation": [presentation: PnwActivityBarPresentation];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:tabBarPlacement": [placement: PnwWorkbenchTabBarPlacement];
  "update:colorScheme": [colorScheme: PnwColorScheme];
  "update:positions": [positions: PnwWorkbenchDisplaySettingsPositions];
  displaySettingsAction: [actionId: string];
  openAdvancedSettings: [];
}>();

defineSlots<{
  "additional-actions"(
    props: PnwWorkbenchDisplaySettingsActionSlotProps,
  ): unknown;
  "panel-extra"(): unknown;
}>();

const pnwTrigger = ref<HTMLElement>();
const pnwOpen = ref(false);
const pnwFullOpen = ref(false);
const pnwLocalPositions = ref<PnwWorkbenchDisplaySettingsPositions>({
  quick: { ...PNW_DEFAULT_WORKBENCH_DISPLAY_SETTINGS_POSITIONS.quick },
  full: { ...PNW_DEFAULT_WORKBENCH_DISPLAY_SETTINGS_POSITIONS.full },
});
const pnwPositions = computed(() => props.positions ?? pnwLocalPositions.value);
const pnwPresets = [
  { id: "tree", label: "侧面目录树", icon: "navigation-tree" },
  { id: "compact-icon", label: "紧凑图标", icon: "compact-toolbar" },
  { id: "compact-title", label: "紧凑图标 + Title", icon: "compact-toolbar-title" },
  { id: "ribbon", label: "大 Ribbon", icon: "ribbon" },
] as const satisfies readonly {
  id: PnwWorkbenchDisplayPreset;
  label: string;
  icon: PnwIconName;
}[];
const pnwActivePreset = computed<PnwWorkbenchDisplayPreset>(() => {
  if ((props.effectivePresentation ?? props.presentation) === "tree") return "tree";
  if (props.appearance.mode === "ribbon") return "ribbon";
  return props.appearance.compact.showTitles ? "compact-title" : "compact-icon";
});
const pnwPanelClass = computed(() => [
  "pnw-workbench-display-panel",
  `pnw-workbench-display-panel--${props.colorScheme}`,
].join(" "));

function pnwUpdatePosition(
  panel: "quick" | "full",
  position: PnwFloatingPanelPosition,
): void {
  const next: PnwWorkbenchDisplaySettingsPositions = {
    quick: panel === "quick" ? position : { ...pnwPositions.value.quick },
    full: panel === "full" ? position : { ...pnwPositions.value.full },
  };
  pnwLocalPositions.value = next;
  emit("update:positions", next);
}

async function pnwShowSettings(): Promise<void> {
  const rect = pnwTrigger.value?.getBoundingClientRect();
  if (rect && props.positions === undefined) {
    pnwUpdatePosition("quick", props.triggerVariant === "ribbon"
      ? { x: Math.max(8, rect.right - 260), y: rect.bottom + 4 }
      : { x: rect.right + 6, y: Math.max(8, rect.bottom - 300) });
  }
  pnwFullOpen.value = false;
  pnwOpen.value = true;
  await nextTick();
}

function pnwApplyPreset(preset: PnwWorkbenchDisplayPreset): void {
  if (props.responsiveNarrow && preset === "tree") return;
  if (preset === "tree") {
    emit("update:presentation", "tree");
    return;
  }
  if (preset === "ribbon") {
    emit("update:appearance", { ...props.appearance, mode: "ribbon" });
  } else {
    emit("update:appearance", {
      ...props.appearance,
      mode: "compact",
      compact: {
        ...props.appearance.compact,
        showTitles: preset === "compact-title",
      },
    });
  }
  emit("update:presentation", "ribbon");
}

function pnwShowFullSettings(): void {
  const rect = pnwTrigger.value?.getBoundingClientRect();
  if (rect && typeof window !== "undefined" && props.positions === undefined) {
    pnwUpdatePosition("full", {
      x: Math.max(8, rect.right - 420),
      y: props.responsiveNarrow
        ? 8
        : Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 540)),
    });
  }
  pnwOpen.value = false;
  pnwFullOpen.value = true;
}

function pnwEmitDisplaySettingsAction(actionId: string): void {
  if (!actionId) return;
  pnwOpen.value = false;
  emit("displaySettingsAction", actionId);
}

function pnwOpenAdvancedSettings(): void {
  pnwOpen.value = false;
  emit("openAdvancedSettings");
}
</script>

<template>
  <div
    class="pnw-workbench-display-settings"
    :data-pnw-display-trigger="triggerVariant"
  >
    <button
      ref="pnwTrigger"
      type="button"
      class="pnw-workbench-display-trigger"
      title="工作台显示设置"
      aria-label="工作台显示设置"
      aria-haspopup="dialog"
      :aria-expanded="pnwOpen || pnwFullOpen"
      @click="pnwShowSettings"
    >
      <PnwIcon :name="triggerVariant === 'ribbon' ? 'more' : 'settings'" :size="20" />
      <span v-if="triggerVariant === 'tree'">工作台显示设置</span>
    </button>

    <PnwFloatingPanel
      :position="pnwPositions.quick"
      :open="pnwOpen"
      title="工作台显示设置"
      aria-label="工作台显示设置快捷菜单"
      :panel-class="pnwPanelClass"
      @update:position="pnwUpdatePosition('quick', $event)"
      @close="pnwOpen = false"
    >
      <section class="pnw-workbench-display-content">
        <p v-if="responsiveNarrow" class="pnw-workbench-display-responsive-hint">
          窄屏固定使用顶部 Ribbon；恢复宽屏后继续使用原导航偏好。
        </p>
        <div class="pnw-workbench-display-presets">
          <button
            v-for="preset in pnwPresets"
            :key="preset.id"
            type="button"
            class="pnw-workbench-display-item"
            :class="{ 'pnw-workbench-display-item--active': pnwActivePreset === preset.id }"
            :aria-pressed="pnwActivePreset === preset.id"
            :disabled="responsiveNarrow && preset.id === 'tree'"
            :title="responsiveNarrow && preset.id === 'tree'
              ? '窄屏固定使用顶部 Ribbon'
              : undefined"
            @click="pnwApplyPreset(preset.id)"
          >
            <PnwIcon :name="preset.icon" :size="18" />
            <span>{{ preset.label }}</span>
          </button>
        </div>

        <button
          type="button"
          class="pnw-workbench-display-item pnw-workbench-display-full-action"
          @click="pnwShowFullSettings"
        >
          <PnwIcon name="settings" :size="18" />
          <span>完整显示设置…</span>
        </button>

        <div class="pnw-workbench-display-additional-actions">
          <slot
            name="additional-actions"
            :emit-action="pnwEmitDisplaySettingsAction"
          />
          <button
            v-if="showAdvancedSettingsAction"
            type="button"
            @click="pnwOpenAdvancedSettings"
          >
            更多产品设置…
          </button>
        </div>
      </section>
    </PnwFloatingPanel>

    <PnwWorkbenchDisplaySettingsPanel
      :open="pnwFullOpen"
      :position="pnwPositions.full"
      :presentation="presentation"
      :effective-presentation="effectivePresentation"
      :responsive-narrow="responsiveNarrow"
      :appearance="appearance"
      :tree-appearance="treeAppearance"
      :tab-bar-placement="tabBarPlacement"
      :color-scheme="colorScheme"
      :show-layout-settings="showLayoutSettings"
      @update:position="pnwUpdatePosition('full', $event)"
      @update:presentation="emit('update:presentation', $event)"
      @update:appearance="emit('update:appearance', $event)"
      @update:tree-appearance="emit('update:treeAppearance', $event)"
      @update:tab-bar-placement="emit('update:tabBarPlacement', $event)"
      @update:color-scheme="emit('update:colorScheme', $event)"
      @close="pnwFullOpen = false"
    >
      <template #additional-sections>
        <slot name="panel-extra" />
      </template>
    </PnwWorkbenchDisplaySettingsPanel>
  </div>
</template>

<style scoped>
.pnw-workbench-display-settings {
  position: relative;
  flex: 0 0 auto;
}

.pnw-workbench-display-responsive-hint {
  margin: 0 0 6px;
  padding: 6px 8px;
  border-radius: 5px;
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13)));
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 10px;
  line-height: 1.4;
}

.pnw-workbench-display-settings[data-pnw-display-trigger="ribbon"] {
  display: flex;
  align-items: stretch;
}

.pnw-workbench-display-settings[data-pnw-display-trigger="tree"],
.pnw-workbench-display-settings[data-pnw-display-trigger="rail"] {
  padding: 4px;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-workbench-display-trigger {
  min-width: 34px;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 5px);
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
}

[data-pnw-display-trigger="ribbon"] .pnw-workbench-display-trigger {
  width: 34px;
  min-height: 100%;
  padding: 0;
  border-radius: 0;
}

[data-pnw-display-trigger="tree"] .pnw-workbench-display-trigger {
  width: 100%;
  justify-content: flex-start;
}

[data-pnw-display-trigger="rail"] .pnw-workbench-display-trigger {
  width: 38px;
  height: 38px;
  padding: 0;
}

.pnw-workbench-display-trigger:hover,
.pnw-workbench-display-trigger:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-workbench-display-trigger:focus-visible {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
}

:global(.pnw-workbench-display-panel) {
  --pnw-floating-panel-width: 260px;
  --pnw-floating-panel-max-height: min(480px, calc(100vh - 16px));
  --pnw-workbench-surface: #fff;
  --pnw-workbench-bg: #f8fafc;
  --pnw-workbench-text: #0f172a;
  --pnw-workbench-muted: #64748b;
  --pnw-workbench-border: #dbe3ed;
  --pnw-control-active-text: #1d4ed8;
  --pnw-control-hover-bg: rgba(59, 130, 246, 0.09);
}

:global(.pnw-workbench-display-panel--dark) {
  color-scheme: dark;
  --pnw-workbench-surface: #111827;
  --pnw-workbench-bg: #0b1220;
  --pnw-workbench-text: #e5edf7;
  --pnw-workbench-muted: #94a3b8;
  --pnw-workbench-border: #2a3a50;
  --pnw-control-active-text: #bfdbfe;
  --pnw-control-hover-bg: rgba(96, 165, 250, 0.14);
}

.pnw-workbench-display-content {
  display: grid;
  gap: 5px;
  padding: 7px;
  color: var(--pnw-workbench-text);
  font-size: 12px;
}

.pnw-workbench-display-presets,
.pnw-workbench-display-additional-actions {
  display: grid;
  gap: 3px;
}

.pnw-workbench-display-item,
.pnw-workbench-display-additional-actions :slotted(button),
.pnw-workbench-display-additional-actions > button {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 5px);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.pnw-workbench-display-item:hover,
.pnw-workbench-display-item:focus-visible,
.pnw-workbench-display-additional-actions :slotted(button:hover),
.pnw-workbench-display-additional-actions :slotted(button:focus-visible),
.pnw-workbench-display-additional-actions > button:hover,
.pnw-workbench-display-additional-actions > button:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg);
}

.pnw-workbench-display-item--active {
  border-color: var(--pnw-control-active-text);
  background: color-mix(in srgb, var(--pnw-control-active-text) 10%, transparent);
  color: var(--pnw-control-active-text);
  font-weight: 700;
}

.pnw-workbench-display-item:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.pnw-workbench-display-item:disabled:hover {
  background: transparent;
}

.pnw-workbench-display-full-action,
.pnw-workbench-display-additional-actions:not(:empty) {
  margin-top: 3px;
  padding-top: 5px;
  border-top-color: var(--pnw-workbench-border);
}

.pnw-workbench-display-additional-actions:not(:empty) {
  border-top: 1px solid var(--pnw-workbench-border);
}

@media (prefers-color-scheme: dark) {
  :global(.pnw-workbench-display-panel--system) {
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
