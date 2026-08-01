<script setup lang="ts">
import { computed, watch } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchDisplaySettingsActionSlotProps } from "../types/PnwWorkbenchVue.js";
import type {
  PnwActivityBarPresentation,
  PnwActivityTreeAppearance,
  PnwNavigationNode,
  PnwRibbonAppearance,
  PnwRibbonDisplayMode,
} from "../types/PnwWorkbenchWeb.js";
import {
  pnwNavigationNodeContains,
  pnwNormalizeNavigationVisibility,
  pnwProjectNavigationRibbon,
  pnwVisibleNavigationNodes,
} from "../utils/pnwNavigationTree.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
  pnwNextRibbonFocusIndex,
  pnwResolveRibbonNaturalHeight,
  pnwValidateRibbonAppearance,
} from "../utils/pnwWorkbenchWeb.js";
import PnwRibbonGroup from "./PnwRibbonGroup.vue";
import PnwRibbonShell from "./PnwRibbonShell.vue";
import PnwWorkbenchDisplaySettings from "./PnwWorkbenchDisplaySettings.vue";
import { usePnwLocale } from "../composables/usePnwLocale.js";

const props = withDefaults(defineProps<{
  nodes: readonly PnwNavigationNode[];
  activeNodeId?: string;
  appearance?: PnwRibbonAppearance;
  presentation?: PnwActivityBarPresentation;
  treeAppearance?: PnwActivityTreeAppearance;
  colorScheme?: PnwColorScheme;
  ariaLabel?: string;
  /** 独立使用时默认显示；组合式 Header 可关闭后由宿主设置遮罩接管。 */
  showAppearanceMenu?: boolean;
  showAdvancedSettingsAction?: boolean;
}>(), {
  activeNodeId: "",
  appearance: () => PNW_DEFAULT_RIBBON_APPEARANCE,
  presentation: "ribbon",
  treeAppearance: () => PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  colorScheme: "system",
  ariaLabel: "",
  showAppearanceMenu: true,
  showAdvancedSettingsAction: false,
});

const emit = defineEmits<{
  activate: [nodeId: string];
  "update:appearance": [appearance: PnwRibbonAppearance];
  "update:treeAppearance": [appearance: PnwActivityTreeAppearance];
  "update:presentation": [presentation: PnwActivityBarPresentation];
  "update:colorScheme": [colorScheme: PnwColorScheme];
  displaySettingsAction: [actionId: string];
  openAdvancedSettings: [];
}>();

defineSlots<{
  "display-settings-actions"(
    props: PnwWorkbenchDisplaySettingsActionSlotProps,
  ): unknown;
  "display-settings-panel-extra"(): unknown;
}>();

const pnwNavigationNodes = computed(() => pnwNormalizeNavigationVisibility(props.nodes));
const { t: pnwT } = usePnwLocale();
const pnwAriaLabel = computed(() => props.ariaLabel || pnwT("workbench.activity"));
const pnwModules = computed(() => pnwProjectNavigationRibbon(pnwNavigationNodes.value));
const pnwActiveModuleId = computed(() => pnwVisibleNavigationNodes(pnwNavigationNodes.value)
  .find((node) => pnwNavigationNodeContains(node, props.activeNodeId))?.id
  ?? pnwModules.value[0]?.id
  ?? "");
const pnwVisibleModules = computed(() => pnwModules.value
  .filter((module) => module.id === pnwActiveModuleId.value));
const pnwAppearanceValidation = computed(() => pnwValidateRibbonAppearance(props.appearance));
const pnwAppearance = computed(() => pnwAppearanceValidation.value.appearance);
const pnwModeAppearance = computed(() => pnwAppearance.value[pnwAppearance.value.mode]);
const pnwActiveIconSize = computed(() => pnwModeAppearance.value.iconSize);
const pnwShowTitles = computed(() => pnwModeAppearance.value.showTitles);
const pnwDisplayMode = computed<PnwRibbonDisplayMode>(() => {
  if (pnwAppearance.value.mode === "ribbon") return "large";
  return pnwAppearance.value.compact.showTitles ? "icon-title" : "icon";
});
const pnwShowGroupLabels = computed(() => pnwAppearance.value.mode === "ribbon"
  && pnwAppearance.value.ribbon.showGroupLabels);
const pnwRibbonNaturalHeight = computed(() => pnwResolveRibbonNaturalHeight(pnwAppearance.value));

watch(pnwAppearanceValidation, (validation) => {
  if (!validation.valid) console.warn(validation.message);
}, { immediate: true });

function pnwRibbonItemIcon(icon: unknown): unknown {
  return icon ?? "•";
}

function pnwHandleRibbonKeydown(event: KeyboardEvent): void {
  if (!(event.currentTarget instanceof HTMLElement) || !(event.target instanceof Element)) return;
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(
    ".pnw-ribbon-tool-btn:not(:disabled)",
  )];
  const currentButton = event.target.closest<HTMLButtonElement>(".pnw-ribbon-tool-btn");
  const currentIndex = currentButton ? buttons.indexOf(currentButton) : -1;
  const nextIndex = pnwNextRibbonFocusIndex(currentIndex, buttons.length, event.key);
  if (nextIndex === null) return;
  event.preventDefault();
  buttons[nextIndex]?.focus();
}
</script>

<template>
  <PnwRibbonShell
    class="pnw-ribbon"
    :data-pnw-ribbon-mode="pnwAppearance.mode"
    :data-pnw-ribbon-display-mode="pnwDisplayMode"
    :data-pnw-ribbon-icon-size="pnwActiveIconSize"
    :data-pnw-ribbon-group-labels="pnwShowGroupLabels"
    :style="{ '--pnw-ribbon-natural-height': `${pnwRibbonNaturalHeight}px` }"
    :show-layout-toggle="false"
  >
    <nav class="pnw-ribbon-navigation" :aria-label="pnwAriaLabel" @keydown="pnwHandleRibbonKeydown">
      <section
        v-for="module in pnwVisibleModules"
        :key="module.id"
        class="pnw-ribbon-module"
        :aria-label="module.label"
      >
        <div class="pnw-ribbon-module-groups">
          <PnwRibbonGroup
            v-for="group in module.groups"
            :key="group.id"
            :label="group.label"
            :display-mode="pnwDisplayMode"
            :icon-size="pnwActiveIconSize"
            :show-label="pnwShowGroupLabels"
            :show-titles="pnwShowTitles"
            :items="group.items.map((node) => ({
              pageId: node.id,
              label: node.label,
              icon: pnwRibbonItemIcon(node.icon),
              active: node.id === activeNodeId,
              disabled: Boolean(node.disabled),
              title: node.label,
            }))"
            @open="emit('activate', $event)"
          />
        </div>
      </section>
    </nav>
    <template #actions>
      <PnwWorkbenchDisplaySettings
        v-if="showAppearanceMenu"
        :presentation="presentation"
        :appearance="pnwAppearance"
        :tree-appearance="treeAppearance"
        :color-scheme="colorScheme"
        :show-advanced-settings-action="showAdvancedSettingsAction"
        trigger-variant="ribbon"
        @update:presentation="emit('update:presentation', $event)"
        @update:appearance="emit('update:appearance', $event)"
        @update:tree-appearance="emit('update:treeAppearance', $event)"
        @update:color-scheme="emit('update:colorScheme', $event)"
        @display-settings-action="emit('displaySettingsAction', $event)"
        @open-advanced-settings="emit('openAdvancedSettings')"
      >
        <template #additional-actions="slotProps">
          <slot name="display-settings-actions" v-bind="slotProps" />
        </template>
        <template #panel-extra>
          <slot name="display-settings-panel-extra" />
        </template>
      </PnwWorkbenchDisplaySettings>
    </template>
  </PnwRibbonShell>
</template>

<style scoped>
.pnw-ribbon {
  width: 100%;
  min-width: 0;
  background: var(--pnw-ribbon-bg, var(--pnw-workbench-default-ribbon-bg, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  border-color: var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  --pnw-ribbon-resolved-height: var(--pnw-ribbon-icon-title-height, var(--pnw-ribbon-natural-height));
}

.pnw-ribbon[data-pnw-ribbon-display-mode="icon"] {
  --pnw-ribbon-resolved-height: var(--pnw-ribbon-icon-height, var(--pnw-ribbon-natural-height));
}

.pnw-ribbon[data-pnw-ribbon-display-mode="large"] {
  --pnw-ribbon-resolved-height: var(--pnw-ribbon-large-height, var(--pnw-ribbon-natural-height));
}

.pnw-ribbon-navigation {
  display: flex;
  min-width: max-content;
  height: var(--pnw-ribbon-height, var(--pnw-ribbon-resolved-height));
  min-height: var(--pnw-ribbon-height, var(--pnw-ribbon-resolved-height));
  transition: height 160ms ease, min-height 160ms ease;
}

.pnw-ribbon-module {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  border-right: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-ribbon-module-groups {
  display: flex;
  align-items: stretch;
}

.pnw-ribbon-module-groups :deep(.pnw-ribbon-group + .pnw-ribbon-group) {
  border-left: 3px solid var(--pnw-ribbon-module-handle, var(--pnw-workbench-border, #dbe3ed));
}

</style>
