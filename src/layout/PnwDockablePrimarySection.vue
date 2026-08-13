<script setup lang="ts">
import { computed } from "vue";
import type {
  PnwDockableToolCommand,
  PnwDockableToolDefinition,
  PnwDockableToolState,
} from "../types/PnwDockableTool.js";
import {
  pnwIsDockableToolVisible,
  pnwReduceDockableToolState,
} from "../utils/pnwDockableTool.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "../components/PnwIcon.vue";
import PnwPrimarySection from "./PnwPrimarySection.vue";

const props = withDefaults(defineProps<{
  definition: PnwDockableToolDefinition;
  state: PnwDockableToolState;
  activeViewId?: string;
  showPlacementAction?: boolean;
}>(), {
  activeViewId: "",
  showPlacementAction: true,
});

const emit = defineEmits<{
  "update:state": [state: PnwDockableToolState];
  float: [];
  close: [];
  move: [placement: PnwDockableToolState["primaryPlacement"]];
}>();

const { t: pnwT } = usePnwLocale();
const pnwVisible = computed(() => (
  props.state.mode === "primary"
  && pnwIsDockableToolVisible(props.definition, props.state, props.activeViewId)
));
const pnwNextPlacement = computed(() => (
  props.state.primaryPlacement === "first" ? "last" : "first"
));
const pnwPlacementLabel = computed(() => pnwT(
  pnwNextPlacement.value === "first"
    ? "dockableTool.moveFirst"
    : "dockableTool.moveLast",
));
const pnwOrder = computed(() => (
  props.state.primaryPlacement === "first" ? -1000 : 1000
));

function pnwApply(command: PnwDockableToolCommand): void {
  emit("update:state", pnwReduceDockableToolState(props.state, command));
}

function pnwFloat(): void {
  pnwApply({ type: "open-floating" });
  emit("float");
}

function pnwClose(): void {
  pnwApply({ type: "close" });
  emit("close");
}

function pnwMove(): void {
  const placement = pnwNextPlacement.value;
  pnwApply({ type: "set-primary-placement", placement });
  emit("move", placement);
}
</script>

<template>
  <PnwPrimarySection
    v-if="pnwVisible"
    class="pnw-dockable-primary-section"
    :style="{ order: pnwOrder }"
    :title="definition.title"
    :aria-label="definition.ariaLabel || definition.title"
    :expanded="state.primaryExpanded"
    :data-pnw-dockable-tool-id="definition.id"
    :data-pnw-primary-placement="state.primaryPlacement"
    @update:expanded="pnwApply({ type: 'set-primary-expanded', expanded: $event })"
  >
    <template #title>
      <slot name="title">{{ definition.title }}</slot>
    </template>
    <template v-if="$slots.suffix" #suffix>
      <slot name="suffix" />
    </template>
    <template #actions>
      <button
        v-if="showPlacementAction"
        type="button"
        class="pnw-dockable-tool-action"
        :title="pnwPlacementLabel"
        :aria-label="pnwPlacementLabel"
        @click="pnwMove"
      >
        <PnwIcon :name="pnwNextPlacement === 'first' ? 'chevron-up' : 'chevron-down'" :size="16" />
      </button>
      <button
        type="button"
        class="pnw-dockable-tool-action"
        :title="pnwT('dockableTool.float')"
        :aria-label="pnwT('dockableTool.float')"
        @click="pnwFloat"
      >
        <PnwIcon name="window-float" :size="16" />
      </button>
      <button
        type="button"
        class="pnw-dockable-tool-action"
        :title="pnwT('dockableTool.close')"
        :aria-label="pnwT('dockableTool.close')"
        @click="pnwClose"
      >
        <PnwIcon name="close" :size="16" />
      </button>
    </template>
    <template #body>
      <slot />
    </template>
  </PnwPrimarySection>
</template>

<style scoped>
.pnw-dockable-tool-action {
  width: 24px;
  height: 24px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

.pnw-dockable-tool-action:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-dockable-tool-action:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}
</style>
