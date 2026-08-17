<script setup lang="ts">
import type { PnwIconName } from "../icons/pnwIconCatalog.js";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  label: string;
  icon?: PnwIconName;
  disabled?: boolean;
  title?: string;
}>(), {
  icon: undefined,
  disabled: false,
  title: undefined,
});

const emit = defineEmits<{
  activate: [event: MouseEvent];
}>();
</script>

<template>
  <button
    type="button"
    class="pnw-workspace-entry-action pnw-workspace-rail-action"
    :disabled="disabled"
    :aria-label="label"
    :title="title ?? label"
    @click="emit('activate', $event)"
  >
    <span class="pnw-workspace-rail-action-content">
      <slot name="icon">
        <PnwIcon
          v-if="props.icon"
          class="pnw-workspace-rail-action-icon"
          :name="props.icon"
          :size="18"
        />
      </slot>
      <span class="pnw-workspace-rail-action-label">
        <slot>{{ label }}</slot>
      </span>
    </span>
  </button>
</template>

<style src="../styles/pnwWorkbenchTheme.css"></style>

<style scoped>
.pnw-workspace-rail-action {
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: normal;
}

.pnw-workspace-rail-action-content {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: var(--pnw-workspace-rail-action-icon-gap, 8px);
}

.pnw-workspace-rail-action-icon {
  flex: none;
  color: currentColor;
}

.pnw-workspace-rail-action-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
