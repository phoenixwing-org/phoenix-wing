<script setup lang="ts">
import { computed } from "vue";
import type { PnwIconName } from "../icons/pnwIconCatalog.js";
import { pnwResolveIcon } from "../composables/pnwIconRegistry.js";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  icon?: unknown;
  fallback?: PnwIconName;
  size?: number | string;
  title?: string;
  decorative?: boolean;
}>(), {
  fallback: "unknown",
  size: 24,
  title: "",
  decorative: true,
});

const pnwResolvedIcon = computed(() => pnwResolveIcon(props.icon, props.fallback));
const pnwAccessibleLabel = computed(() => props.title
  || pnwResolvedIcon.value.requestedId
  || (pnwResolvedIcon.value.kind === "pnw" ? pnwResolvedIcon.value.name : "icon"));
</script>

<template>
  <span
    class="pnw-icon-renderer"
    :style="{
      '--pnw-icon-renderer-width': typeof size === 'number' ? `${size}px` : size,
      '--pnw-icon-renderer-height': typeof size === 'number' ? `${size}px` : size,
    }"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : pnwAccessibleLabel"
    :aria-hidden="decorative ? 'true' : undefined"
    :data-pnw-icon-id="pnwResolvedIcon.requestedId"
    :data-pnw-icon-fallback="pnwResolvedIcon.fallback ? 'true' : undefined"
  >
    <PnwIcon
      v-if="pnwResolvedIcon.kind === 'pnw'"
      :name="pnwResolvedIcon.name"
      :size="size"
      decorative
    />
    <component
      :is="pnwResolvedIcon.component"
      v-else-if="pnwResolvedIcon.kind === 'component'"
      class="pnw-icon-renderer-component"
      aria-hidden="true"
    />
    <span v-else class="pnw-icon-renderer-text" aria-hidden="true">
      {{ pnwResolvedIcon.text }}
    </span>
  </span>
</template>

<style scoped>
.pnw-icon-renderer {
  display: inline-flex;
  width: var(--pnw-icon-renderer-width, 24px);
  height: var(--pnw-icon-renderer-height, 24px);
  flex: none;
  align-items: center;
  justify-content: center;
  color: inherit;
  line-height: 1;
}

.pnw-icon-renderer > :deep(svg),
.pnw-icon-renderer-component {
  width: 100%;
  height: 100%;
}

.pnw-icon-renderer-text {
  overflow: hidden;
  font-size: .9em;
  line-height: 1;
  text-overflow: clip;
  white-space: nowrap;
}
</style>
